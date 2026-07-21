import { z } from "zod";

export const practiceAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.string().trim().min(1, "请选择或填写答案").max(200, "答案过长"),
});

export type PracticeAnswerInput = z.infer<typeof practiceAnswerSchema>;
