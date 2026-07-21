import { z } from "zod";

export const reviewSchema = z.object({
  userWordId: z.number().int().positive(),
  rating: z.enum(["again", "hard", "good", "easy"]),
  pronunciationMatched: z.boolean().optional(),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional(),
});

export const settingsSchema = z.object({
  weeklyGoal: z.number().int("请输入整数").min(20, "每周至少 20 个").max(350, "每周最多 350 个"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
