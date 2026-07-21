import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { database } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { settingsSchema } from "@/lib/validation/study";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });
  return NextResponse.json({ weeklyGoal: user.weeklyGoal, nickname: user.nickname, email: user.email });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "每周目标设置有误" }, { status: 400 });
  await database.update(users).set({ weeklyGoal: parsed.data.weeklyGoal, updatedAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true, weeklyGoal: parsed.data.weeklyGoal });
}
