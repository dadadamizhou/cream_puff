import "server-only";

import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { database } from "@/db";
import { dailyPracticeSessions, practiceQuestions, userWords, words } from "@/db/schema";
import type {
  PracticeAnswerData,
  PracticeQuestion,
  PracticeSummary,
  PracticeType,
  PracticeTodayData,
} from "@/types/practice";

const DAILY_QUESTION_COUNT = 15;
const RETRY_DELAY_MS = 10 * 60 * 1000;
const PRACTICE_TYPES: PracticeType[] = [
  "meaning_to_word",
  "word_to_meaning",
  "listening_choice",
  "listening_dictation",
  "translation_dictation",
];

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

function normalizeAnswer(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
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
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  const uniqueAlternatives = Array.from(
    new Set(alternatives.filter((value) => value && normalizeAnswer(value) !== normalizedCorrect)),
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

function summarizeQuestions(questions: Array<{ selectedAnswer: string | null; isCorrect: boolean | null }>): PracticeSummary {
  const total = questions.length;
  const answered = questions.filter((question) => question.selectedAnswer !== null).length;
  const correct = questions.filter((question) => question.isCorrect === true).length;
  return {
    total,
    answered,
    correct,
    incorrect: answered - correct,
    remaining: total - answered,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    completed: total > 0 && answered === total,
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
  if (Number(existing?.value ?? 0) >= DAILY_QUESTION_COUNT) return;

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
    .limit(DAILY_QUESTION_COUNT);

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

  for (let position = 0; position < DAILY_QUESTION_COUNT; position += 1) {
    const target = targets[position % targets.length];
    const type = PRACTICE_TYPES[position % PRACTICE_TYPES.length];
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
        questionCount: DAILY_QUESTION_COUNT,
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
  const summary = summarizeQuestions(rows);

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
  if (question.selectedAnswer !== null) throw new Error("QUESTION_ALREADY_ANSWERED");

  const answer = args.answer.trim();
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);
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
    if (!updated) throw new Error("QUESTION_ALREADY_ANSWERED");

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
    const summary = summarizeQuestions(questionStates);
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

  return {
    question: toPublicQuestion({ ...question, selectedAnswer: answer, isCorrect }),
    summary: result.summary,
    scheduling: result.scheduling,
  };
}
