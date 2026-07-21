import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { answerPracticeQuestion } from "@/lib/practice";
import { describePracticeError } from "@/lib/practice-errors";
import { practiceAnswerSchema } from "@/lib/validation/practice";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  const parsed = practiceAnswerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "答题数据格式有误" }, { status: 400 });

  try {
    return NextResponse.json(await answerPracticeQuestion({ userId: user.id, ...parsed.data }));
  } catch (error) {
    const details = describePracticeError(error);
    if (details.status >= 500) console.error("[practice/answer]", error);
    return NextResponse.json(
      { code: details.code, message: details.message, action: details.action },
      { status: details.status },
    );
  }
}
