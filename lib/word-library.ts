import "server-only";

import { and, asc, count, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { database } from "@/db";
import { reviewLogs, userWords, wordBookEntries, words } from "@/db/schema";
import type { WordLibraryData } from "@/types/word-library";
import type { WordLibraryQuery } from "@/lib/validation/words";
import { clampWordLibraryPage, escapeLikePattern, getShanghaiDayRange, getShanghaiWeekStart, getWordProgressStatus } from "@/lib/word-library-logic";
import { WORD_BOOK_IDS, type WordBookId } from "@/lib/word-books";

function getStatusCondition(status: WordLibraryQuery["status"], currentWeek: string): SQL | undefined {
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
      return eq(userWords.assignedWeek, currentWeek);
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
  const bookWordIds = query.book === "all" ? undefined : database
    .select({ wordId: wordBookEntries.wordId })
    .from(wordBookEntries)
    .where(eq(wordBookEntries.wordBook, query.book));
  const bookCondition = bookWordIds ? inArray(words.id, bookWordIds) : undefined;
  const listCondition = and(searchCondition, bookCondition, scopeCondition, getStatusCondition(query.status, currentWeek));

  const [summaryRows, totalRows] = await Promise.all([
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
  ]);

  const summary = summaryRows[0];
  const total = Number(totalRows[0]?.value ?? 0);
  const totalPages = Math.ceil(total / query.pageSize);
  const page = clampWordLibraryPage(query.page, total, query.pageSize);
  const itemRows = await database
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
    .offset((page - 1) * query.pageSize);
  const membershipRows = itemRows.length ? await database
    .select({ wordId: wordBookEntries.wordId, wordBook: wordBookEntries.wordBook })
    .from(wordBookEntries)
    .where(inArray(wordBookEntries.wordId, itemRows.map((item) => item.id))) : [];
  const memberships = new Map<number, WordBookId[]>();
  for (const membership of membershipRows) {
    const values = memberships.get(membership.wordId) ?? [];
    values.push(membership.wordBook);
    memberships.set(membership.wordId, values);
  }

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
      wordBooks: WORD_BOOK_IDS.filter((wordBook) => memberships.get(item.id)?.includes(wordBook)),
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
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
}
