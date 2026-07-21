import { describe, expect, it } from "vitest";
import {
  createPracticePlan,
  createPracticePlanExtension,
  getPracticeQuestionCount,
  normalizePracticeAnswer,
  PRACTICE_TYPES,
  summarizePracticeQuestions,
} from "../lib/practice-logic";
import { describePracticeError } from "../lib/practice-errors";

describe("daily practice plan", () => {
  it.each([
    [1, 5],
    [2, 10],
    [5, 20],
    [10, 20],
  ])("scales to %i learned words with %i bounded questions", (targetCount, expectedCount) => {
    const learnedWords = Array.from({ length: targetCount }, (_, id) => ({ id, spelling: `word-${id}` }));
    const plan = createPracticePlan(learnedWords);

    expect(plan).toHaveLength(expectedCount);
    expect(new Set(plan.map((item) => `${item.target.id}:${item.type}`)).size).toBe(expectedCount);
    const typeCounts = PRACTICE_TYPES.map((type) => plan.filter((item) => item.type === type).length);
    expect(Math.max(...typeCounts) - Math.min(...typeCounts)).toBeLessThanOrEqual(1);
  });

  it("does not repeat one question type for a target before cycling", () => {
    const learnedWord = { id: 7, spelling: "abandon" };
    const plan = createPracticePlan([learnedWord]);

    expect(plan).toHaveLength(5);
    expect(plan.every((item) => item.target === learnedWord)).toBe(true);
    expect(new Set(plan.map((item) => item.type)).size).toBe(5);
  });

  it("never introduces a target outside the learned-word input", () => {
    const learnedWords = [{ id: 1 }, { id: 2 }];
    const learnedIds = new Set(learnedWords.map((word) => word.id));
    const plan = createPracticePlan(learnedWords);

    expect(plan).toHaveLength(10);
    expect(plan.every((item) => learnedIds.has(item.target.id))).toBe(true);
  });

  it.each([
    [0, 0],
    [1, 5],
    [3, 15],
    [4, 20],
    [25, 50],
  ])("computes a bounded question count for %i targets", (targetCount, expectedCount) => {
    expect(getPracticeQuestionCount(targetCount)).toBe(expectedCount);
  });

  it("extends an old unfinished session without reusing word/type pairs or positions", () => {
    const targets = Array.from({ length: 5 }, (_, wordId) => ({ wordId }));
    const existing = Array.from({ length: 15 }, (_, position) => ({
      position,
      wordId: position % targets.length,
      type: PRACTICE_TYPES[position % PRACTICE_TYPES.length],
    }));
    const extension = createPracticePlanExtension(targets, 20, existing);

    expect(extension).toHaveLength(5);
    expect(extension.map((item) => item.position)).toEqual([15, 16, 17, 18, 19]);
    expect(extension.every((item) => !existing.some((old) => old.wordId === item.target.wordId && old.type === item.type))).toBe(true);
  });
});

describe("practice answer helpers", () => {
  it("normalizes whitespace, width and casing for dictation", () => {
    expect(normalizePracticeAnswer("  ＡＢＡＮＤＯＮ  ")).toBe("abandon");
  });

  it("summarizes persisted answers", () => {
    expect(summarizePracticeQuestions([
      { selectedAnswer: "a", isCorrect: true },
      { selectedAnswer: "b", isCorrect: false },
      { selectedAnswer: null, isCorrect: null },
    ])).toMatchObject({ total: 3, answered: 2, correct: 1, incorrect: 1, remaining: 1, accuracy: 50, completed: false });
  });
});

describe("practice error details", () => {
  it("turns a missing Postgres relation into migration guidance", () => {
    const details = describePracticeError({
      message: "Failed query",
      cause: { code: "42P01", message: 'relation "practice_questions" does not exist' },
    });

    expect(details).toMatchObject({ code: "DATABASE_MIGRATION_REQUIRED", status: 503 });
    expect(details.action).toContain("npm run db:migrate");
  });

  it("keeps the no-learned-words state distinct from a server failure", () => {
    expect(describePracticeError(new Error("NO_WORDS_AVAILABLE"))).toMatchObject({
      code: "NO_LEARNED_WORDS",
      status: 409,
    });
  });
});
