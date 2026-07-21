import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reviewWord } from "@/lib/study";
import { reviewSchema } from "@/lib/validation/study";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "复习数据格式有误" }, { status: 400 });
  try {
    const result = await reviewWord({ ...parsed.data, userId: user.id, weeklyGoal: user.weeklyGoal });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "WORD_NOT_FOUND") return NextResponse.json({ message: "任务不存在" }, { status: 404 });
    return NextResponse.json({ message: "暂时无法记录，请稍后再试" }, { status: 500 });
  }
}
