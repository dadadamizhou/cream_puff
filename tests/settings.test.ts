import { describe, expect, it } from "vitest";
import { settingsSchema } from "../lib/validation/study";

describe("weekly goal settings", () => {
  it("accepts presets and custom weekly targets", () => {
    expect(settingsSchema.safeParse({ weeklyGoal: 30 }).success).toBe(true);
    expect(settingsSchema.safeParse({ weeklyGoal: 60 }).success).toBe(true);
    expect(settingsSchema.safeParse({ weeklyGoal: 137 }).success).toBe(true);
  });

  it("rejects targets outside the supported range", () => {
    expect(settingsSchema.safeParse({ weeklyGoal: 19 }).success).toBe(false);
    expect(settingsSchema.safeParse({ weeklyGoal: 351 }).success).toBe(false);
    expect(settingsSchema.safeParse({ weeklyGoal: "60" }).success).toBe(false);
  });
});
