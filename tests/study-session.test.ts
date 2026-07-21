import { describe, expect, it } from "vitest";
import { chunkStudyTasks, getRecallDirection, isSpellingCorrect, partitionStudyTasks } from "../lib/study-session";
import type { StudyTask } from "../types/study";

function task(id: number, reviewCount = 0, stage = 0): StudyTask {
  return {
    id,
    wordId: id,
    spelling: `word${id}`,
    phonetic: "",
    definition: "",
    example: "",
    exampleTranslation: "",
    memoryTip: "",
    wordBook: "grade1",
    stage,
    reviewCount,
    nextReviewAt: "2026-07-21T00:00:00.000Z",
    firstLearnedAt: "2026-07-21T00:00:00.000Z",
  };
}

describe("study session planning", () => {
  it("separates due reviews from unseen words without changing their order", () => {
    const result = partitionStudyTasks([task(1, 2), task(2), task(3, 1), task(4)]);
    expect(result.reviews.map((item) => item.id)).toEqual([1, 3]);
    expect(result.newWords.map((item) => item.id)).toEqual([2, 4]);
  });

  it("splits new words into small batches", () => {
    const batches = chunkStudyTasks(Array.from({ length: 12 }, (_, index) => task(index + 1)));
    expect(batches.map((batch) => batch.length)).toEqual([5, 5, 2]);
  });

  it("uses meaning recall first and productive spelling for stronger memories", () => {
    expect(getRecallDirection(task(1, 1, 1))).toBe("meaning");
    expect(getRecallDirection(task(2, 2, 2))).toBe("spelling");
    expect(getRecallDirection(task(3, 3, 1))).toBe("spelling");
  });

  it("checks spelling without case or punctuation noise", () => {
    expect(isSpellingCorrect("  A-pple ", "apple")).toBe(true);
    expect(isSpellingCorrect("apply", "apple")).toBe(false);
  });
});
