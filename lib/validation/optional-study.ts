import { z } from "zod";

export const optionalStudySchema = z.object({
  mode: z.enum(["review", "advance"]),
});

export type OptionalStudyInput = z.infer<typeof optionalStudySchema>;
