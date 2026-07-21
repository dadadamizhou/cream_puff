import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { wordLibraryQuerySchema } from "@/lib/validation/words";
import { getWordLibrary } from "@/lib/word-library";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  const searchParams = new URL(request.url).searchParams;
  const parsed = wordLibraryQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    book: searchParams.get("book") ?? undefined,
    scope: searchParams.get("scope") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_QUERY", message: parsed.error.issues[0]?.message ?? "词库筛选参数有误" },
      { status: 400 },
    );
  }

  return NextResponse.json(await getWordLibrary(user.id, parsed.data));
}
