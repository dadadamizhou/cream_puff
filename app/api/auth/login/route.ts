import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { database } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "提交内容有误" }, { status: 400 });
  }

  const user = await database.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ message: "邮箱或密码错误" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
