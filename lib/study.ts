import "server-only";

import { and, asc, count, desc, eq, gt, gte, lt, lte, notExists, sql } from "drizzle-orm";
import { database } from "@/db";
import { dailyCheckins, dailyCheckinWords, reviewLogs, userWords, words } from "@/db/schema";
import type { Rating } from "@/lib/scheduler";
import { resolveReviewSchedule } from "@/lib/review-scheduling";
import { normalizeWordBooks, type WordBookId } from "@/lib/word-books";
import {
  DAY_MS,
  getCumulativeWeeklyTarget,
  getDailyCheckinCounts,
  getShanghaiDateKey,
  getShanghaiDayStart,
  getShanghaiWeekStart,
  getTomorrowAssignmentPlan,
} from "@/lib/study-planning";
import type { OptionalStudyData, OptionalStudyMode, ReviewSource, StudyTask } from "@/types/study";

const OPTIONAL_REVIEW_LIMIT = 20;
export const TODAY_TASKS_REMAINING = "TODAY_TASKS_REMAINING";

const studyTaskSelection = {
  id: userWords.id,
  wordId: words.id,
  spelling: words.spelling,
  phonetic: words.phonetic,
  definition: words.definition,
  example: words.example,
  exampleTranslation: words.exampleTranslation,
  memoryTip: words.memoryTip,
  wordBook: words.wordBook,
  stage: userWords.stage,
  reviewCount: userWords.reviewCount,
  nextReviewAt: userWords.nextReviewAt,
  firstLearnedAt: userWords.firstLearnedAt,
};

type StudyTaskRow = Omit<StudyTask, "nextReviewAt" | "firstLearnedAt"> & {
  nextReviewAt: Date;
  firstLearnedAt: Date;
};

function serializeStudyTask(task: StudyTaskRow): StudyTask {
  return {
    ...task,
    nextReviewAt: task.nextReviewAt.toISOString(),
    firstLearnedAt: task.firstLearnedAt.toISOString(),
  };
}

export async function ensureTodayAssignments(userId: string, weeklyGoal: number, enabledWordBooks: WordBookId[]) {
  const now = new Date();
  const currentWeek = getShanghaiWeekStart(now);

  await database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`study-assignments:${userId}`}))`);
    const assignedThisWeek = await tx
      .select({ value: count() })
      .from(userWords)
      .where(and(eq(userWords.userId, userId), eq(userWords.assignedWeek, currentWeek)));
    let remaining = Math.max(0, getCumulativeWeeklyTarget(weeklyGoal, now) - Number(assignedThisWeek[0]?.value ?? 0));

    for (const wordBook of normalizeWordBooks(enabledWordBooks)) {
      if (remaining <= 0) break;
      const candidates = await tx
        .select({ id: words.id })
        .from(words)
        .where(and(
          eq(words.wordBook, wordBook),
          sql`NOT EXISTS (SELECT 1 FROM user_words WHERE user_words.word_id = ${words.id} AND user_words.user_id = ${userId})`,
        ))
        .orderBy(sql`random()`)
        .limit(remaining);
      if (!candidates.length) continue;
      const inserted = await tx.insert(userWords).values(
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
      ).onConflictDoNothing({ target: [userWords.userId, userWords.wordId] }).returning({ id: userWords.id });
      remaining -= inserted.length;
    }
  });
}

export async function getTodayData(userId: string, weeklyGoal: number, enabledWordBooks: WordBookId[]) {
  const normalizedWordBooks = normalizeWordBooks(enabledWordBooks);
  await ensureTodayAssignments(userId, weeklyGoal, normalizedWordBooks);
  const now = new Date();
  const currentWeek = getShanghaiWeekStart(now);
  const today = getShanghaiDateKey(now);
  const todayStart = getShanghaiDayStart(now);
  const tomorrow = new Date(todayStart.getTime() + DAY_MS);

  const taskRows = await database
    .select(studyTaskSelection)
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(eq(userWords.userId, userId), lte(userWords.nextReviewAt, now)))
    .orderBy(asc(userWords.nextReviewAt), sql`random()`);

  const completedRows = await database
    .select({ wordId: dailyCheckinWords.wordId })
    .from(dailyCheckinWords)
    .where(and(eq(dailyCheckinWords.userId, userId), eq(dailyCheckinWords.date, today)));
  const checkin = getDailyCheckinCounts(
    completedRows.map((row) => row.wordId),
    taskRows.map((row) => row.wordId),
  );
  await persistDailyCheckin(userId, today, checkin, now);
  const [weekStats] = await database
    .select({
      scheduled: count(userWords.id),
      learned: sql<number>`sum(case when ${userWords.reviewCount} > 0 then 1 else 0 end)`,
      mastered: sql<number>`sum(case when ${userWords.masteredAt} is not null then 1 else 0 end)`,
    })
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
    .where(and(eq(userWords.userId, userId), gt(userWords.reviewCount, 0)))
    .groupBy(userWords.stage);
  const [overall] = await database
    .select({
      learned: sql<number>`sum(case when ${userWords.reviewCount} > 0 then 1 else 0 end)`,
      mastered: sql<number>`sum(case when ${userWords.masteredAt} is not null then 1 else 0 end)`,
    })
    .from(userWords)
    .where(eq(userWords.userId, userId));
  const [catalog] = await database.select({ total: count(words.id) }).from(words);
  const learnedTotal = Number(overall?.learned ?? 0);

  return {
    date: today,
    weekStart: currentWeek,
    tasks: taskRows.map(serializeStudyTask),
    checkin,
    plan: {
      weeklyGoal,
      dailyAverage: Math.ceil(weeklyGoal / 7),
      enabledWordBooks: normalizedWordBooks,
      currentWordBook: normalizedWordBooks.find((book) => taskRows.some((task) => task.reviewCount === 0 && task.wordBook === book)) ?? null,
    },
    week: {
      scheduled: Number(weekStats?.scheduled ?? 0),
      learned: Number(weekStats?.learned ?? 0),
      mastered: Number(weekStats?.mastered ?? 0),
      goal: weeklyGoal,
    },
    activeDays,
    streak: calculateStreak(recentCheckins.map((entry) => entry.date), now),
    stageCounts: stageCounts.map((entry) => ({ stage: entry.stage, count: Number(entry.count) })),
    overall: {
      learned: learnedTotal,
      mastered: Number(overall?.mastered ?? 0),
      remaining: Math.max(0, Number(catalog?.total ?? 0) - learnedTotal),
    },
    tomorrow,
  };
}

function calculateStreak(completedDates: string[], now: Date) {
  const completed = new Set(completedDates);
  let cursor = getShanghaiDayStart(now);
  if (!completed.has(getShanghaiDateKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  let streak = 0;
  while (completed.has(getShanghaiDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export async function getOptionalStudy(args: {
  userId: string;
  weeklyGoal: number;
  enabledWordBooks: WordBookId[];
  mode: OptionalStudyMode;
}): Promise<OptionalStudyData> {
  const now = new Date();

  if (args.mode === "review") {
    const todayStart = getShanghaiDayStart(now);
    const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
    const rows = await database
      .select(studyTaskSelection)
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(and(
        eq(userWords.userId, args.userId),
        gt(userWords.reviewCount, 0),
        gt(userWords.nextReviewAt, now),
        notExists(
          database
            .select({ id: reviewLogs.id })
            .from(reviewLogs)
            .where(and(
              eq(reviewLogs.userId, args.userId),
              eq(reviewLogs.wordId, userWords.wordId),
              gte(reviewLogs.reviewedAt, todayStart),
              lt(reviewLogs.reviewedAt, tomorrowStart),
            )),
        ),
      ))
      .orderBy(asc(userWords.lastReviewedAt), sql`random()`)
      .limit(OPTIONAL_REVIEW_LIMIT);
    const tasks = rows.map(serializeStudyTask);
    return {
      mode: "review",
      targetDate: null,
      tasks,
      message: tasks.length ? null : "当前没有额外可复习的单词",
    };
  }

  await ensureTodayAssignments(args.userId, args.weeklyGoal, args.enabledWordBooks);
  const advanceNow = new Date();
  const [due] = await database
    .select({ value: count() })
    .from(userWords)
    .where(and(eq(userWords.userId, args.userId), lte(userWords.nextReviewAt, advanceNow)));
  if (Number(due?.value ?? 0) > 0) throw new Error(TODAY_TASKS_REMAINING);

  let plan = getTomorrowAssignmentPlan(advanceNow, args.weeklyGoal, 0);
  await database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`study-assignments:${args.userId}`}))`);
    const tomorrowWeek = getShanghaiWeekStart(plan.start);
    const [assigned] = await tx
      .select({ value: count() })
      .from(userWords)
      .where(and(eq(userWords.userId, args.userId), eq(userWords.assignedWeek, tomorrowWeek)));
    plan = getTomorrowAssignmentPlan(advanceNow, args.weeklyGoal, Number(assigned?.value ?? 0));

    if (plan.needNew <= 0) return;
    let remaining = plan.needNew;
    for (const wordBook of normalizeWordBooks(args.enabledWordBooks)) {
      if (remaining <= 0) break;
      const candidates = await tx
        .select({ id: words.id })
        .from(words)
        .where(and(
          eq(words.wordBook, wordBook),
          sql`NOT EXISTS (SELECT 1 FROM user_words WHERE user_words.word_id = ${words.id} AND user_words.user_id = ${args.userId})`,
        ))
        .orderBy(sql`random()`)
        .limit(remaining);
      if (!candidates.length) continue;

      const inserted = await tx.insert(userWords).values(candidates.map((word) => ({
        userId: args.userId,
        wordId: word.id,
        stage: 0,
        reviewCount: 0,
        lapseCount: 0,
        nextReviewAt: plan.start,
        firstLearnedAt: plan.start,
        assignedWeek: plan.weekStart,
      }))).onConflictDoNothing({ target: [userWords.userId, userWords.wordId] }).returning({ id: userWords.id });
      remaining -= inserted.length;
    }
  });

  const rows = await database
    .select(studyTaskSelection)
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(
      eq(userWords.userId, args.userId),
      eq(userWords.assignedWeek, plan.weekStart),
      eq(userWords.reviewCount, 0),
      eq(userWords.nextReviewAt, plan.start),
    ))
    .orderBy(sql`random()`);
  const tasks = rows.map(serializeStudyTask);
  return {
    mode: "advance",
    targetDate: plan.date,
    tasks,
    message: tasks.length ? null : "明天的学习计划已经完成",
  };
}

export async function reviewWord(args: {
  userId: string;
  userWordId: number;
  rating: Rating;
  source: ReviewSource;
  pronunciationMatched?: boolean;
  durationMs?: number;
  weeklyGoal: number;
}) {
  const [entry] = await database.select().from(userWords).where(and(eq(userWords.id, args.userWordId), eq(userWords.userId, args.userId))).limit(1);
  if (!entry) throw new Error("WORD_NOT_FOUND");
  const now = new Date();
  const { nextStage, nextReviewAt, masteredAt } = resolveReviewSchedule({
    source: args.source,
    stage: entry.stage,
    rating: args.rating,
    currentNextReviewAt: entry.nextReviewAt,
    currentMasteredAt: entry.masteredAt,
    now,
  });
  const today = getShanghaiDateKey(now);

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
    if (args.source === "today") {
      await tx.insert(dailyCheckinWords).values({
        userId: args.userId,
        date: today,
        wordId: entry.wordId,
        createdAt: now,
      }).onConflictDoNothing({
        target: [dailyCheckinWords.userId, dailyCheckinWords.date, dailyCheckinWords.wordId],
      });
    }
  });

  if (args.source === "today") await updateDailyCheckin(args.userId, now);
  return { nextStage, nextReviewAt };
}

async function updateDailyCheckin(userId: string, now: Date) {
  const today = getShanghaiDateKey(now);
  const [completedRows, dueRows] = await Promise.all([
    database
      .select({ wordId: dailyCheckinWords.wordId })
      .from(dailyCheckinWords)
      .where(and(eq(dailyCheckinWords.userId, userId), eq(dailyCheckinWords.date, today))),
    database
      .select({ wordId: userWords.wordId })
      .from(userWords)
      .where(and(eq(userWords.userId, userId), lte(userWords.nextReviewAt, now))),
  ]);
  const checkin = getDailyCheckinCounts(
    completedRows.map((row) => row.wordId),
    dueRows.map((row) => row.wordId),
  );
  await persistDailyCheckin(userId, today, checkin, now);
}

async function persistDailyCheckin(
  userId: string,
  date: string,
  checkin: { completedCount: number; targetCount: number; fullyCompleted: boolean },
  now: Date,
) {
  await database.insert(dailyCheckins).values({
    userId,
    date,
    ...checkin,
    updatedAt: now,
  }).onConflictDoUpdate({ target: [dailyCheckins.userId, dailyCheckins.date], set: {
    ...checkin,
    updatedAt: now,
  }});
}
