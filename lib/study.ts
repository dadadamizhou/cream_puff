import "server-only";

import { and, asc, count, countDistinct, desc, eq, gte, lte, sql } from "drizzle-orm";
import { database } from "@/db";
import { dailyCheckins, reviewLogs, userWords, words } from "@/db/schema";
import { getNextReviewAt, getNextStage, STAGES, type Rating } from "@/lib/scheduler";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayStart(date = new Date()) {
  const key = dateKey(date);
  return new Date(`${key}T00:00:00+08:00`);
}

function weekStart(date = new Date()) {
  const [year, month, day] = dateKey(date).split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const weekday = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - weekday + 1);
  return start.toISOString().slice(0, 10);
}

function daysSinceMonday(date = new Date()) {
  const [year, month, day] = dateKey(date).split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
  return weekday - 1;
}

export async function ensureTodayAssignments(userId: string, weeklyGoal: number) {
  const now = new Date();
  const currentWeek = weekStart(now);
  const assignedThisWeek = await database
    .select({ value: count() })
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.assignedWeek, currentWeek)));
  const targetByToday = Math.min(weeklyGoal, Math.ceil((weeklyGoal * (daysSinceMonday(now) + 1)) / 7));
  const needNew = Math.max(0, targetByToday - Number(assignedThisWeek[0]?.value ?? 0));

  if (needNew > 0) {
    const candidates = await database
      .select({ id: words.id })
      .from(words)
      .where(sql`NOT EXISTS (SELECT 1 FROM user_words WHERE user_words.word_id = ${words.id} AND user_words.user_id = ${userId})`)
      .orderBy(asc(words.position))
      .limit(needNew);
    if (candidates.length) {
      await database.insert(userWords).values(
        candidates.map((word) => ({
          userId,
          wordId: word.id,
          stage: 0,
          reviewCount: 0,
          lapseCount: 0,
          nextReviewAt: now,
          firstLearnedAt: now,
          assignedWeek: currentWeek,
        })),
      );
    }
  }
}

export async function getTodayData(userId: string, weeklyGoal: number) {
  await ensureTodayAssignments(userId, weeklyGoal);
  const now = new Date();
  const currentWeek = weekStart(now);
  const today = dateKey(now);
  const todayStart = dayStart(now);
  const tomorrow = new Date(todayStart.getTime() + DAY);

  const taskRows = await database
    .select({
      id: userWords.id,
      wordId: words.id,
      spelling: words.spelling,
      phonetic: words.phonetic,
      definition: words.definition,
      example: words.example,
      exampleTranslation: words.exampleTranslation,
      memoryTip: words.memoryTip,
      stage: userWords.stage,
      reviewCount: userWords.reviewCount,
      nextReviewAt: userWords.nextReviewAt,
      firstLearnedAt: userWords.firstLearnedAt,
    })
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(eq(userWords.userId, userId), lte(userWords.nextReviewAt, now)))
    .orderBy(asc(userWords.nextReviewAt), asc(words.position));

  let [checkin] = await database.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, today))).limit(1);
  const targetCount = Math.max(checkin?.targetCount ?? 0, taskRows.length + (checkin?.completedCount ?? 0));
  if (!checkin && targetCount > 0) {
    await database.insert(dailyCheckins).values({ userId, date: today, completedCount: 0, targetCount, fullyCompleted: targetCount === 0, updatedAt: now });
    [checkin] = await database.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, today))).limit(1);
  } else if (targetCount > checkin.targetCount) {
    const fullyCompleted = checkin.completedCount >= targetCount;
    await database.update(dailyCheckins).set({ targetCount, fullyCompleted, updatedAt: now }).where(eq(dailyCheckins.id, checkin.id));
    checkin = { ...checkin, targetCount, fullyCompleted };
  }
  const [weekStats] = await database
    .select({ assigned: count(userWords.id), mastered: sql<number>`sum(case when ${userWords.masteredAt} is not null then 1 else 0 end)` })
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.assignedWeek, currentWeek)));

  const activeDays = await database
    .select({ date: dailyCheckins.date, fullyCompleted: dailyCheckins.fullyCompleted })
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.date, currentWeek), lte(dailyCheckins.date, today)));
  const recentCheckins = await database
    .select({ date: dailyCheckins.date })
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.fullyCompleted, true), lte(dailyCheckins.date, today)))
    .orderBy(desc(dailyCheckins.date))
    .limit(365);
  const stageCounts = await database
    .select({ stage: userWords.stage, count: count(userWords.id) })
    .from(userWords)
    .where(eq(userWords.userId, userId))
    .groupBy(userWords.stage);
  const [overall] = await database
    .select({ learned: count(userWords.id), mastered: sql<number>`sum(case when ${userWords.masteredAt} is not null then 1 else 0 end)` })
    .from(userWords)
    .where(eq(userWords.userId, userId));

  return {
    date: today,
    weekStart: currentWeek,
    tasks: taskRows,
    checkin: checkin ?? { completedCount: 0, targetCount, fullyCompleted: false },
    plan: { weeklyGoal, dailyAverage: Math.ceil(weeklyGoal / 7) },
    week: { assigned: Number(weekStats?.assigned ?? 0), mastered: Number(weekStats?.mastered ?? 0), goal: weeklyGoal },
    activeDays,
    streak: calculateStreak(recentCheckins.map((entry) => entry.date), now),
    stageCounts: stageCounts.map((entry) => ({ stage: entry.stage, count: Number(entry.count) })),
    overall: { learned: Number(overall?.learned ?? 0), mastered: Number(overall?.mastered ?? 0) },
    tomorrow,
  };
}

function calculateStreak(completedDates: string[], now: Date) {
  const completed = new Set(completedDates);
  let cursor = dayStart(now);
  if (!completed.has(dateKey(cursor))) cursor = new Date(cursor.getTime() - DAY);
  let streak = 0;
  while (completed.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return streak;
}

export async function reviewWord(args: {
  userId: string;
  userWordId: number;
  rating: Rating;
  pronunciationMatched?: boolean;
  durationMs?: number;
  weeklyGoal: number;
}) {
  const [entry] = await database.select().from(userWords).where(and(eq(userWords.id, args.userWordId), eq(userWords.userId, args.userId))).limit(1);
  if (!entry) throw new Error("WORD_NOT_FOUND");
  const now = new Date();
  const nextStage = getNextStage(entry.stage, args.rating);
  const nextReviewAt = getNextReviewAt(entry.stage, args.rating, now);
  const masteredAt = nextStage >= STAGES.length - 1 ? (entry.masteredAt ?? now) : null;

  await database.transaction(async (tx) => {
    await tx.update(userWords).set({
      stage: nextStage,
      reviewCount: entry.reviewCount + 1,
      lapseCount: entry.lapseCount + (args.rating === "again" ? 1 : 0),
      lastReviewedAt: now,
      nextReviewAt,
      masteredAt,
    }).where(and(eq(userWords.id, entry.id), eq(userWords.userId, args.userId)));
    await tx.insert(reviewLogs).values({
      userId: args.userId,
      wordId: entry.wordId,
      rating: args.rating,
      previousStage: entry.stage,
      nextStage,
      pronunciationMatched: args.pronunciationMatched,
      durationMs: args.durationMs ?? 0,
      reviewedAt: now,
    });
  });

  await updateDailyCheckin(args.userId, args.weeklyGoal);
  return { nextStage, nextReviewAt };
}

async function updateDailyCheckin(userId: string, weeklyGoal: number) {
  const now = new Date();
  const today = dateKey(now);
  const [todayStats] = await database
    .select({ completed: countDistinct(reviewLogs.wordId) })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), gte(reviewLogs.reviewedAt, dayStart(now)), lte(reviewLogs.reviewedAt, new Date(dayStart(now).getTime() + DAY - 1))));
  const completedCount = Number(todayStats?.completed ?? 0);
  const [existing] = await database.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, today))).limit(1);
  const targetCount = Math.max(1, existing?.targetCount ?? Math.ceil(weeklyGoal / 7));
  await database.insert(dailyCheckins).values({
    userId,
    date: today,
    completedCount,
    targetCount,
    fullyCompleted: completedCount >= targetCount,
    updatedAt: now,
  }).onConflictDoUpdate({ target: [dailyCheckins.userId, dailyCheckins.date], set: {
    completedCount,
    targetCount,
    fullyCompleted: completedCount >= targetCount,
    updatedAt: now,
  }});
}
