import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { describePracticeError } from "@/lib/practice-errors";
import { getTodayPractice } from "@/lib/practice";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  try {
    return NextResponse.json(await getTodayPractice(user.id));
  } catch (error) {
    const details = describePracticeError(error);
    if (details.status >= 500) console.error("[practice/today]", error);
    return NextResponse.json(
      { code: details.code, message: details.message, action: details.action },
      { status: details.status },
    );
  }
}
