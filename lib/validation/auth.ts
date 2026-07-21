import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码不能超过 72 位"),
});

export const registerSchema = loginSchema.extend({
  nickname: z.string().trim().min(1, "请输入昵称").max(20, "昵称不能超过 20 个字"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
