import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTodayData } from "@/lib/study";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });
  return NextResponse.json(await getTodayData(user.id, user.weeklyGoal));
}
