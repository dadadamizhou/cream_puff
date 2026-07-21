import "server-only";

import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { database } from "@/db";
import { dailyPracticeSessions, practiceQuestions, userWords, words } from "@/db/schema";
import {
  createPracticePlan,
  DAILY_PRACTICE_QUESTION_COUNT,
  normalizePracticeAnswer,
  summarizePracticeQuestions,
} from "@/lib/practice-logic";
import type {
  PracticeAnswerData,
  PracticeQuestion,
  PracticeType,
  PracticeTodayData,
} from "@/types/practice";

const RETRY_DELAY_MS = 10 * 60 * 1000;

type PracticeQuestionRow = {
  id: number;
  type: PracticeType;
  prompt: string;
  audioText: string | null;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  spelling: string;
  phonetic: string;
  definition: string;
  example: string;
};

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildOptions(correctAnswer: string, alternatives: string[]) {
  const normalizedCorrect = normalizePracticeAnswer(correctAnswer);
  const uniqueAlternatives = Array.from(
    new Set(alternatives.filter((value) => value && normalizePracticeAnswer(value) !== normalizedCorrect)),
  );
  return shuffle([correctAnswer, ...shuffle(uniqueAlternatives).slice(0, 3)]);
}

function toPublicQuestion(row: PracticeQuestionRow): PracticeQuestion {
  const answered = row.selectedAnswer !== null;
  return {
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    audioText: row.audioText,
    options: row.options,
    answered,
    selectedAnswer: row.selectedAnswer,
    isCorrect: row.isCorrect,
    correctAnswer: answered ? row.correctAnswer : null,
    explanation: answered
      ? {
          spelling: row.spelling,
          phonetic: row.phonetic,
          definition: row.definition,
          example: row.example,
        }
      : null,
  };
}

async function loadQuestions(sessionId: number, userId: string) {
  return database
    .select({
      id: practiceQuestions.id,
      type: practiceQuestions.type,
      prompt: practiceQuestions.prompt,
      audioText: practiceQuestions.audioText,
      options: practiceQuestions.options,
      correctAnswer: practiceQuestions.correctAnswer,
      selectedAnswer: practiceQuestions.selectedAnswer,
      isCorrect: practiceQuestions.isCorrect,
      spelling: words.spelling,
      phonetic: words.phonetic,
      definition: words.definition,
      example: words.example,
    })
    .from(practiceQuestions)
    .innerJoin(words, eq(practiceQuestions.wordId, words.id))
    .where(and(eq(practiceQuestions.sessionId, sessionId), eq(practiceQuestions.userId, userId)))
    .orderBy(asc(practiceQuestions.position));
}

async function ensurePracticeQuestions(sessionId: number, userId: string) {
  const [existing] = await database
    .select({ value: count() })
    .from(practiceQuestions)
    .where(and(eq(practiceQuestions.sessionId, sessionId), eq(practiceQuestions.userId, userId)));
  if (Number(existing?.value ?? 0) >= DAILY_PRACTICE_QUESTION_COUNT) return;

  const targets = await database
    .select({
      wordId: words.id,
      spelling: words.spelling,
      definition: words.definition,
    })
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(eq(userWords.userId, userId), gt(userWords.reviewCount, 0)))
    .orderBy(desc(userWords.lapseCount), asc(userWords.nextReviewAt), asc(words.position))
    .limit(DAILY_PRACTICE_QUESTION_COUNT);

  if (targets.length === 0) throw new Error("NO_WORDS_AVAILABLE");

  const distractors = await database
    .select({ spelling: words.spelling, definition: words.definition })
    .from(words)
    .orderBy(sql`random()`)
    .limit(80);
  const spellingAlternatives = [...targets, ...distractors].map((word) => word.spelling);
  const definitionAlternatives = [...targets, ...distractors].map((word) => word.definition);
  const now = new Date();
  const generated: (typeof practiceQuestions.$inferInsert)[] = [];

  for (const { position, target, type } of createPracticePlan(targets)) {
    const base = {
      sessionId,
      userId,
      wordId: target.wordId,
      type,
      position,
      audioText: null as string | null,
      options: [] as string[],
      prompt: "",
      correctAnswer: target.spelling,
      createdAt: now,
    };

    if (type === "meaning_to_word") {
      generated.push({
        ...base,
        prompt: `“${target.definition}”对应哪个单词？`,
        options: buildOptions(target.spelling, spellingAlternatives),
      });
    } else if (type === "word_to_meaning") {
      generated.push({
        ...base,
        prompt: `“${target.spelling}”的正确释义是？`,
        options: buildOptions(target.definition, definitionAlternatives),
        correctAnswer: target.definition,
      });
    } else if (type === "listening_choice") {
      generated.push({
        ...base,
        prompt: "听发音，选择正确的中文释义",
        audioText: target.spelling,
        options: buildOptions(target.definition, definitionAlternatives),
        correctAnswer: target.definition,
      });
    } else if (type === "listening_dictation") {
      generated.push({
        ...base,
        prompt: "听发音，写出你听到的单词",
        audioText: target.spelling,
      });
    } else {
      generated.push({
        ...base,
        prompt: `根据中文释义默写英文单词：${target.definition}`,
      });
    }
  }

  await database
    .insert(practiceQuestions)
    .values(generated)
    .onConflictDoNothing({ target: [practiceQuestions.sessionId, practiceQuestions.position] });

  const [actual] = await database
    .select({ value: count() })
    .from(practiceQuestions)
    .where(and(eq(practiceQuestions.sessionId, sessionId), eq(practiceQuestions.userId, userId)));
  await database
    .update(dailyPracticeSessions)
    .set({ questionCount: Number(actual?.value ?? 0), updatedAt: now })
    .where(and(eq(dailyPracticeSessions.id, sessionId), eq(dailyPracticeSessions.userId, userId)));
}

export async function getTodayPractice(userId: string): Promise<PracticeTodayData> {
  const today = dateKey();
  const now = new Date();
  let [session] = await database
    .select()
    .from(dailyPracticeSessions)
    .where(and(eq(dailyPracticeSessions.userId, userId), eq(dailyPracticeSessions.date, today)))
    .limit(1);

  if (!session) {
    const [created] = await database
      .insert(dailyPracticeSessions)
      .values({
        userId,
        date: today,
        status: "in_progress",
        questionCount: DAILY_PRACTICE_QUESTION_COUNT,
        answeredCount: 0,
        correctCount: 0,
        startedAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: [dailyPracticeSessions.userId, dailyPracticeSessions.date] })
      .returning();
    session = created;
    if (!session) {
      [session] = await database
        .select()
        .from(dailyPracticeSessions)
        .where(and(eq(dailyPracticeSessions.userId, userId), eq(dailyPracticeSessions.date, today)))
        .limit(1);
    }
  }

  if (!session) throw new Error("PRACTICE_CREATE_FAILED");
  await ensurePracticeQuestions(session.id, userId);
  const rows = await loadQuestions(session.id, userId);
  const questions = rows.map(toPublicQuestion);
  const summary = summarizePracticeQuestions(rows);

  return {
    practice: {
      id: session.id,
      date: session.date,
      status: summary.completed ? "completed" : "in_progress",
    },
    questions,
    summary,
  };
}

export async function answerPracticeQuestion(args: {
  userId: string;
  questionId: number;
  answer: string;
}): Promise<PracticeAnswerData> {
  const [question] = await database
    .select({
      id: practiceQuestions.id,
      sessionId: practiceQuestions.sessionId,
      wordId: practiceQuestions.wordId,
      type: practiceQuestions.type,
      prompt: practiceQuestions.prompt,
      audioText: practiceQuestions.audioText,
      options: practiceQuestions.options,
      correctAnswer: practiceQuestions.correctAnswer,
      selectedAnswer: practiceQuestions.selectedAnswer,
      isCorrect: practiceQuestions.isCorrect,
      spelling: words.spelling,
      phonetic: words.phonetic,
      definition: words.definition,
      example: words.example,
    })
    .from(practiceQuestions)
    .innerJoin(words, eq(practiceQuestions.wordId, words.id))
    .where(and(eq(practiceQuestions.id, args.questionId), eq(practiceQuestions.userId, args.userId)))
    .limit(1);

  if (!question) throw new Error("QUESTION_NOT_FOUND");
  if (question.selectedAnswer !== null) {
    const rows = await loadQuestions(question.sessionId, args.userId);
    return {
      question: toPublicQuestion(question),
      summary: summarizePracticeQuestions(rows),
      scheduling: { affected: false, userWordId: null, stage: null, nextReviewAt: null },
    };
  }

  const answer = args.answer.trim();
  const isCorrect = normalizePracticeAnswer(answer) === normalizePracticeAnswer(question.correctAnswer);
  const now = new Date();

  const result = await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(practiceQuestions)
      .set({ selectedAnswer: answer, isCorrect, answeredAt: now })
      .where(
        and(
          eq(practiceQuestions.id, question.id),
          eq(practiceQuestions.userId, args.userId),
          isNull(practiceQuestions.selectedAnswer),
        ),
      )
      .returning({ id: practiceQuestions.id });
    if (!updated) return null;

    let scheduling: PracticeAnswerData["scheduling"] = {
      affected: false,
      userWordId: null,
      stage: null,
      nextReviewAt: null,
    };

    if (!isCorrect) {
      const [entry] = await tx
        .select()
        .from(userWords)
        .where(and(eq(userWords.userId, args.userId), eq(userWords.wordId, question.wordId)))
        .limit(1);
      if (entry) {
        const stage = Math.max(0, entry.stage - 1);
        const nextReviewAt = new Date(now.getTime() + RETRY_DELAY_MS);
        await tx
          .update(userWords)
          .set({
            stage,
            lapseCount: sql`${userWords.lapseCount} + 1`,
            nextReviewAt,
            lastReviewedAt: now,
            masteredAt: null,
          })
          .where(and(eq(userWords.id, entry.id), eq(userWords.userId, args.userId)));
        scheduling = {
          affected: true,
          userWordId: entry.id,
          stage,
          nextReviewAt: nextReviewAt.toISOString(),
        };
      }
    }

    const questionStates = await tx
      .select({ selectedAnswer: practiceQuestions.selectedAnswer, isCorrect: practiceQuestions.isCorrect })
      .from(practiceQuestions)
      .where(
        and(eq(practiceQuestions.sessionId, question.sessionId), eq(practiceQuestions.userId, args.userId)),
      );
    const summary = summarizePracticeQuestions(questionStates);
    await tx
      .update(dailyPracticeSessions)
      .set({
        status: summary.completed ? "completed" : "in_progress",
        questionCount: summary.total,
        answeredCount: summary.answered,
        correctCount: summary.correct,
        completedAt: summary.completed ? now : null,
        updatedAt: now,
      })
      .where(
        and(eq(dailyPracticeSessions.id, question.sessionId), eq(dailyPracticeSessions.userId, args.userId)),
      );

    return { summary, scheduling };
  });

  if (!result) {
    const [latest] = await database
      .select({
        id: practiceQuestions.id,
        sessionId: practiceQuestions.sessionId,
        wordId: practiceQuestions.wordId,
        type: practiceQuestions.type,
        prompt: practiceQuestions.prompt,
        audioText: practiceQuestions.audioText,
        options: practiceQuestions.options,
        correctAnswer: practiceQuestions.correctAnswer,
        selectedAnswer: practiceQuestions.selectedAnswer,
        isCorrect: practiceQuestions.isCorrect,
        spelling: words.spelling,
        phonetic: words.phonetic,
        definition: words.definition,
        example: words.example,
      })
      .from(practiceQuestions)
      .innerJoin(words, eq(practiceQuestions.wordId, words.id))
      .where(and(eq(practiceQuestions.id, args.questionId), eq(practiceQuestions.userId, args.userId)))
      .limit(1);
    if (!latest || latest.selectedAnswer === null) throw new Error("QUESTION_NOT_FOUND");
    const rows = await loadQuestions(latest.sessionId, args.userId);
    return {
      question: toPublicQuestion(latest),
      summary: summarizePracticeQuestions(rows),
      scheduling: { affected: false, userWordId: null, stage: null, nextReviewAt: null },
    };
  }

  return {
    question: toPublicQuestion({ ...question, selectedAnswer: answer, isCorrect }),
    summary: result.summary,
    scheduling: result.scheduling,
  };
}
