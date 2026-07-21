import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTodayPractice } from "@/lib/practice";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  try {
    return NextResponse.json(await getTodayPractice(user.id));
  } catch (error) {
    if (error instanceof Error && error.message === "NO_WORDS_AVAILABLE") {
      return NextResponse.json({ message: "请先完成几个今日学习单词，再来参加练习" }, { status: 409 });
    }
    return NextResponse.json({ message: "暂时无法生成每日一练，请稍后再试" }, { status: 500 });
  }
}
