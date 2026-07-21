import { describe, expect, it } from "vitest";
import { resolveReviewSchedule } from "../lib/review-scheduling";
import { reviewSchema } from "../lib/validation/study";

describe("review source validation", () => {
  it("keeps existing clients on today's required-task source", () => {
    expect(reviewSchema.parse({ userWordId: 1, rating: "good" }).source).toBe("today");
    expect(reviewSchema.parse({ userWordId: 1, rating: "good", source: "advance" }).source).toBe("advance");
    expect(reviewSchema.safeParse({ userWordId: 1, rating: "good", source: "practice" }).success).toBe(false);
  });
});

describe("optional review scheduling", () => {
  const now = new Date("2026-07-21T00:00:00.000Z");
  const currentNextReviewAt = new Date("2026-08-20T00:00:00.000Z");

  it("records good and easy recall without advancing the SRS schedule", () => {
    for (const rating of ["good", "easy"] as const) {
      const result = resolveReviewSchedule({
        source: "optional-review",
        stage: 3,
        rating,
        currentNextReviewAt,
        currentMasteredAt: null,
        now,
      });
      expect(result.nextStage).toBe(3);
      expect(result.nextReviewAt).toEqual(currentNextReviewAt);
      expect(result.masteredAt).toBeNull();
    }
  });

  it("can pull hard and forgotten words forward without postponing them", () => {
    const hard = resolveReviewSchedule({
      source: "optional-review",
      stage: 3,
      rating: "hard",
      currentNextReviewAt,
      currentMasteredAt: null,
      now,
    });
    expect(hard.nextStage).toBe(3);
    expect(hard.nextReviewAt.toISOString()).toBe("2026-07-22T00:00:00.000Z");

    const again = resolveReviewSchedule({
      source: "optional-review",
      stage: 3,
      rating: "again",
      currentNextReviewAt: new Date("2026-07-21T00:05:00.000Z"),
      currentMasteredAt: null,
      now,
    });
    expect(again.nextStage).toBe(2);
    expect(again.nextReviewAt.toISOString()).toBe("2026-07-21T00:05:00.000Z");
  });

  it("keeps normal scheduling for today and advance sources", () => {
    for (const source of ["today", "advance"] as const) {
      const result = resolveReviewSchedule({
        source,
        stage: 2,
        rating: "good",
        currentNextReviewAt,
        currentMasteredAt: null,
        now,
      });
      expect(result.nextStage).toBe(3);
      expect(result.nextReviewAt.toISOString()).toBe("2026-07-25T00:00:00.000Z");
    }
  });
});
