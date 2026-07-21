import "server-only";

import { and, asc, count, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { database } from "@/db";
import { reviewLogs, userWords, words } from "@/db/schema";
import type { WordLibraryData } from "@/types/word-library";
import type { WordLibraryQuery } from "@/lib/validation/words";
import { escapeLikePattern, getShanghaiDayRange, getShanghaiWeekStart, getWordProgressStatus } from "@/lib/word-library-logic";

function getStatusCondition(status: WordLibraryQuery["status"]): SQL | undefined {
  switch (status) {
    case "learned":
      return gt(userWords.reviewCount, 0);
    case "learning":
      return and(gt(userWords.reviewCount, 0), isNull(userWords.masteredAt));
    case "mastered":
      return isNotNull(userWords.masteredAt);
    case "unlearned":
      return sql`coalesce(${userWords.reviewCount}, 0) = 0`;
    case "scheduled":
      return isNotNull(userWords.id);
    default:
      return undefined;
  }
}

function getScopeCondition(userId: string, query: WordLibraryQuery, currentWeek: string): SQL | undefined {
  if (query.scope === "week") return eq(userWords.assignedWeek, currentWeek);
  if (query.scope !== "day" || !query.date) return undefined;

  const { start, end } = getShanghaiDayRange(query.date);
  const reviewedWordIds = database
    .select({ wordId: reviewLogs.wordId })
    .from(reviewLogs)
    .where(and(
      eq(reviewLogs.userId, userId),
      gte(reviewLogs.reviewedAt, start),
      lt(reviewLogs.reviewedAt, end),
    ));
  return inArray(words.id, reviewedWordIds);
}

export async function getWordLibrary(userId: string, query: WordLibraryQuery): Promise<WordLibraryData> {
  const currentWeek = getShanghaiWeekStart();
  const currentUserJoin = and(eq(userWords.wordId, words.id), eq(userWords.userId, userId));
  const searchPattern = query.q ? `%${escapeLikePattern(query.q)}%` : null;
  const searchCondition = searchPattern
    ? or(ilike(words.spelling, searchPattern), ilike(words.definition, searchPattern))
    : undefined;
  const scopeCondition = getScopeCondition(userId, query, currentWeek);
  const bookCondition = query.book === "all" ? undefined : eq(words.wordBook, query.book);
  const listCondition = and(searchCondition, bookCondition, scopeCondition, getStatusCondition(query.status));

  const [summaryRows, totalRows, itemRows] = await Promise.all([
    database
      .select({
        total: count(words.id),
        learned: sql<number>`count(*) filter (where coalesce(${userWords.reviewCount}, 0) > 0)`,
        learning: sql<number>`count(*) filter (where coalesce(${userWords.reviewCount}, 0) > 0 and ${userWords.masteredAt} is null)`,
        mastered: sql<number>`count(*) filter (where ${userWords.masteredAt} is not null)`,
        remaining: sql<number>`count(*) filter (where coalesce(${userWords.reviewCount}, 0) = 0)`,
        scheduledThisWeek: sql<number>`count(*) filter (where ${userWords.assignedWeek} = ${currentWeek})`,
      })
      .from(words)
      .leftJoin(userWords, currentUserJoin)
      .where(bookCondition),
    database
      .select({ value: count(words.id) })
      .from(words)
      .leftJoin(userWords, currentUserJoin)
      .where(listCondition),
    database
      .select({
        id: words.id,
        spelling: words.spelling,
        phonetic: words.phonetic,
        definition: words.definition,
        wordBook: words.wordBook,
        stage: userWords.stage,
        reviewCount: userWords.reviewCount,
        assignedWeek: userWords.assignedWeek,
        masteredAt: userWords.masteredAt,
      })
      .from(words)
      .leftJoin(userWords, currentUserJoin)
      .where(listCondition)
      .orderBy(asc(words.position), asc(words.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
  ]);

  const summary = summaryRows[0];
  const total = Number(totalRows[0]?.value ?? 0);

  return {
    summary: {
      total: Number(summary?.total ?? 0),
      learned: Number(summary?.learned ?? 0),
      learning: Number(summary?.learning ?? 0),
      mastered: Number(summary?.mastered ?? 0),
      remaining: Number(summary?.remaining ?? 0),
      scheduledThisWeek: Number(summary?.scheduledThisWeek ?? 0),
    },
    items: itemRows.map((item) => ({
      id: item.id,
      spelling: item.spelling,
      phonetic: item.phonetic,
      definition: item.definition,
      wordBook: item.wordBook,
      stage: item.stage,
      reviewCount: item.reviewCount ?? 0,
      assignedWeek: item.assignedWeek,
      status: getWordProgressStatus(item.reviewCount, item.masteredAt),
    })),
    filters: {
      status: query.status,
      book: query.book,
      scope: query.scope,
      q: query.q,
      date: query.scope === "day" ? (query.date ?? null) : null,
    },
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}
