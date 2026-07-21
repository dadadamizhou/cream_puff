import { describe, expect, it } from "vitest";
import {
  createPracticePlan,
  normalizePracticeAnswer,
  summarizePracticeQuestions,
} from "../lib/practice-logic";
import { describePracticeError } from "../lib/practice-errors";

describe("daily practice plan", () => {
  it("builds all 15 questions even when only one learned word is available", () => {
    const learnedWord = { id: 7, spelling: "abandon" };
    const plan = createPracticePlan([learnedWord]);

    expect(plan).toHaveLength(15);
    expect(plan.every((item) => item.target === learnedWord)).toBe(true);
    expect(new Set(plan.map((item) => item.type)).size).toBe(5);
  });

  it("never introduces a target outside the learned-word input", () => {
    const learnedWords = [{ id: 1 }, { id: 2 }];
    const learnedIds = new Set(learnedWords.map((word) => word.id));
    const plan = createPracticePlan(learnedWords);

    expect(plan).toHaveLength(15);
    expect(plan.every((item) => learnedIds.has(item.target.id))).toBe(true);
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
