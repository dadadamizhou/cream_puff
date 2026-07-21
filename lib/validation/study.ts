import { z } from "zod";
import { WORD_BOOK_IDS } from "../word-books";

export const reviewSchema = z.object({
  userWordId: z.number().int().positive(),
  rating: z.enum(["again", "hard", "good", "easy"]),
  source: z.enum(["today", "optional-review", "advance"]).default("today"),
  pronunciationMatched: z.boolean().optional(),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional(),
});

export const settingsSchema = z.object({
  weeklyGoal: z.number().int("请输入整数").min(20, "每周至少 20 个").max(350, "每周最多 350 个"),
  enabledWordBooks: z.array(z.enum(WORD_BOOK_IDS)).min(1, "请至少选择一个词库").transform((books) => WORD_BOOK_IDS.filter((book) => books.includes(book))),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
