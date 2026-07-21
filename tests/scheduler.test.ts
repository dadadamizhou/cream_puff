import { describe, expect, it } from "vitest";
import { getNextReviewAt, getNextStage } from "../lib/scheduler";

describe("review scheduler", () => {
  const now = new Date("2026-07-21T00:00:00.000Z");

  it("repeats forgotten words after ten minutes and lowers their stage", () => {
    expect(getNextStage(3, "again")).toBe(2);
    expect(getNextReviewAt(3, "again", now).getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it("advances remembered words by one stage", () => {
    expect(getNextStage(2, "good")).toBe(3);
    expect(getNextReviewAt(2, "good", now).getTime() - now.getTime()).toBe(4 * 24 * 60 * 60 * 1000);
  });

  it("advances easy words by two stages without overflowing", () => {
    expect(getNextStage(5, "easy")).toBe(6);
    expect(getNextStage(6, "easy")).toBe(6);
  });

  it("keeps hard words at their current stage and repeats tomorrow", () => {
    expect(getNextStage(4, "hard")).toBe(4);
    expect(getNextReviewAt(4, "hard", now).getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
