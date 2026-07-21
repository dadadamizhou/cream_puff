import { describe, expect, it } from "vitest";
import { settingsSchema } from "../lib/validation/study";

describe("weekly goal settings", () => {
  it("accepts presets and custom weekly targets", () => {
    expect(settingsSchema.safeParse({ weeklyGoal: 30, enabledWordBooks: ["grade1"] }).success).toBe(true);
    expect(settingsSchema.safeParse({ weeklyGoal: 60, enabledWordBooks: ["grade1", "grade2"] }).success).toBe(true);
    expect(settingsSchema.safeParse({ weeklyGoal: 137, enabledWordBooks: ["cet4"] }).success).toBe(true);
  });

  it("rejects targets outside the supported range", () => {
    expect(settingsSchema.safeParse({ weeklyGoal: 19, enabledWordBooks: ["grade1"] }).success).toBe(false);
    expect(settingsSchema.safeParse({ weeklyGoal: 351, enabledWordBooks: ["grade1"] }).success).toBe(false);
    expect(settingsSchema.safeParse({ weeklyGoal: "60", enabledWordBooks: ["grade1"] }).success).toBe(false);
  });

  it("requires at least one supported word book and keeps progression order", () => {
    expect(settingsSchema.safeParse({ weeklyGoal: 60, enabledWordBooks: [] }).success).toBe(false);
    expect(settingsSchema.safeParse({ weeklyGoal: 60, enabledWordBooks: ["middle-school"] }).success).toBe(false);
    expect(settingsSchema.parse({ weeklyGoal: 60, enabledWordBooks: ["cet4", "grade1"] }).enabledWordBooks).toEqual(["grade1", "cet4"]);
  });
});
