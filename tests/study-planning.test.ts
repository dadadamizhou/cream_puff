import { describe, expect, it } from "vitest";
import { getCumulativeWeeklyTarget, getDailyCheckinCounts, getTomorrowAssignmentPlan } from "../lib/study-planning";
import { optionalStudySchema } from "../lib/validation/optional-study";

describe("optional study validation", () => {
  it("accepts only supported optional-study modes", () => {
    expect(optionalStudySchema.safeParse({ mode: "review" }).success).toBe(true);
    expect(optionalStudySchema.safeParse({ mode: "advance" }).success).toBe(true);
    expect(optionalStudySchema.safeParse({ mode: "tomorrow" }).success).toBe(false);
    expect(optionalStudySchema.safeParse({}).success).toBe(false);
  });
});

describe("weekly assignment planning in Asia/Shanghai", () => {
  it("uses the cumulative target for the next day in the same week", () => {
    const mondayNoon = new Date("2026-07-20T04:00:00.000Z");
    expect(getCumulativeWeeklyTarget(60, mondayNoon)).toBe(9);
    expect(getTomorrowAssignmentPlan(mondayNoon, 60, 9)).toMatchObject({
      date: "2026-07-21",
      weekStart: "2026-07-20",
      cumulativeTarget: 18,
      needNew: 9,
    });
  });

  it("starts from the new week's Monday target when tomorrow crosses a week", () => {
    const sundayNoon = new Date("2026-07-19T04:00:00.000Z");
    const plan = getTomorrowAssignmentPlan(sundayNoon, 60, 0);
    expect(plan).toMatchObject({
      date: "2026-07-20",
      weekStart: "2026-07-20",
      cumulativeTarget: 9,
      needNew: 9,
    });
    expect(plan.start.toISOString()).toBe("2026-07-19T16:00:00.000Z");
  });

  it("never allocates beyond an already satisfied cumulative target", () => {
    const plan = getTomorrowAssignmentPlan(new Date("2026-07-20T04:00:00.000Z"), 60, 20);
    expect(plan.needNew).toBe(0);
  });
});

describe("daily check-in task identity", () => {
  it("counts the union of completed and currently due word IDs", () => {
    expect(getDailyCheckinCounts([1, 2], [2, 3, 3])).toEqual({
      completedCount: 2,
      targetCount: 3,
      fullyCompleted: false,
    });
  });

  it("does not grow the target when a completed word becomes due again", () => {
    expect(getDailyCheckinCounts([1, 2], [1, 2])).toEqual({
      completedCount: 2,
      targetCount: 2,
      fullyCompleted: true,
    });
  });
});
