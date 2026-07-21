import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOptionalStudy, TODAY_TASKS_REMAINING } from "@/lib/study";
import { optionalStudySchema } from "@/lib/validation/optional-study";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  const parsed = optionalStudySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_MODE", message: "请选择自由复习或提前学习" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getOptionalStudy({
      userId: user.id,
      weeklyGoal: user.weeklyGoal,
      enabledWordBooks: user.enabledWordBooks,
      mode: parsed.data.mode,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === TODAY_TASKS_REMAINING) {
      return NextResponse.json(
        { code: TODAY_TASKS_REMAINING, message: "请先完成今天的必做任务，再开始提前学习" },
        { status: 409 },
      );
    }
    console.error("[study/optional]", error);
    return NextResponse.json({ message: "暂时无法准备可选任务，请稍后再试" }, { status: 500 });
  }
}
