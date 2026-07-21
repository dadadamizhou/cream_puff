import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { answerPracticeQuestion } from "@/lib/practice";
import { practiceAnswerSchema } from "@/lib/validation/practice";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  const parsed = practiceAnswerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "答题数据格式有误" }, { status: 400 });

  try {
    return NextResponse.json(await answerPracticeQuestion({ userId: user.id, ...parsed.data }));
  } catch (error) {
    if (error instanceof Error && error.message === "QUESTION_NOT_FOUND") {
      return NextResponse.json({ message: "题目不存在" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "QUESTION_ALREADY_ANSWERED") {
      return NextResponse.json({ message: "这道题已经作答" }, { status: 409 });
    }
    return NextResponse.json({ message: "暂时无法提交答案，请稍后再试" }, { status: 500 });
  }
}
