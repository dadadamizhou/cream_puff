import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { database } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "提交内容有误" }, { status: 400 });
  }

  const existingUser = await database.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (existingUser) {
    return NextResponse.json({ message: "该邮箱已经注册" }, { status: 409 });
  }

  const now = new Date();
  const userId = randomUUID();
  await database.insert(users).values({
    id: userId,
    email: parsed.data.email,
    nickname: parsed.data.nickname,
    passwordHash: await hash(parsed.data.password, 12),
    createdAt: now,
    updatedAt: now,
  });
  await createSession(userId);

  return NextResponse.json({ ok: true }, { status: 201 });
}
