import { describe, expect, it } from "vitest";
import { practiceAnswerSchema } from "../lib/validation/practice";

describe("practice answer validation", () => {
  it("accepts choice and dictation answers", () => {
    expect(practiceAnswerSchema.safeParse({ questionId: 1, answer: "abandon" }).success).toBe(true);
    expect(practiceAnswerSchema.safeParse({ questionId: 2, answer: "  放弃；遗弃  " }).success).toBe(true);
  });

  it("rejects empty or invalid submissions", () => {
    expect(practiceAnswerSchema.safeParse({ questionId: 0, answer: "word" }).success).toBe(false);
    expect(practiceAnswerSchema.safeParse({ questionId: 1, answer: "   " }).success).toBe(false);
  });
});
