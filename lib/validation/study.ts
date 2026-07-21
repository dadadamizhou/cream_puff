import { z } from "zod";

export const reviewSchema = z.object({
  userWordId: z.number().int().positive(),
  rating: z.enum(["again", "hard", "good", "easy"]),
  pronunciationMatched: z.boolean().optional(),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional(),
});

export const settingsSchema = z.object({
  weeklyGoal: z.union([z.literal(30), z.literal(60), z.literal(90)]),
});
