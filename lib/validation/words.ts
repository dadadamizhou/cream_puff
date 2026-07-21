import { z } from "zod";
import { isValidDateKey } from "../word-library-logic";
import { WORD_BOOK_IDS } from "../word-books";

export const wordLibraryQuerySchema = z.object({
  status: z.enum(["all", "learned", "learning", "mastered", "unlearned", "scheduled"]).default("all"),
  book: z.enum(["all", ...WORD_BOOK_IDS]).default("all"),
  scope: z.enum(["all", "week", "day"]).default("all"),
  date: z.string().trim().refine(isValidDateKey, "日期格式应为 YYYY-MM-DD").optional(),
  q: z.string().trim().max(80, "搜索内容不能超过 80 个字符").default(""),
  page: z.coerce.number().int("页码必须是整数").min(1, "页码必须从 1 开始").default(1),
  pageSize: z.coerce.number().int("每页数量必须是整数").min(1).max(100, "每页最多显示 100 个单词").default(30),
}).superRefine((value, context) => {
  if (value.scope === "day" && !value.date) {
    context.addIssue({ code: "custom", path: ["date"], message: "查看每日复习记录时必须提供日期" });
  }
});

export type WordLibraryQuery = z.infer<typeof wordLibraryQuerySchema>;
