export type PracticeErrorCode =
  | "NO_LEARNED_WORDS"
  | "DATABASE_MIGRATION_REQUIRED"
  | "DATABASE_CREDENTIALS_INVALID"
  | "DATABASE_UNAVAILABLE"
  | "PRACTICE_CREATE_FAILED"
  | "QUESTION_NOT_FOUND"
  | "QUESTION_ALREADY_ANSWERED"
  | "PRACTICE_UNAVAILABLE";

export type PracticeErrorDetails = {
  code: PracticeErrorCode;
  message: string;
  action: string;
  status: number;
};

const DETAILS: Record<PracticeErrorCode, Omit<PracticeErrorDetails, "code">> = {
  NO_LEARNED_WORDS: {
    status: 409,
    message: "还没有可练习的已学单词",
    action: "先完成至少 1 个单词的学习并提交掌握评价，再回来开始每日一练。",
  },
  DATABASE_MIGRATION_REQUIRED: {
    status: 503,
    message: "每日一练的数据表还没有创建",
    action: "请先在项目目录运行 npm run db:migrate，完成后刷新页面。",
  },
  DATABASE_CREDENTIALS_INVALID: {
    status: 503,
    message: "数据库连接配置无效",
    action: "请检查 DATABASE_URL 是否为当前 Neon 数据库的有效连接地址。",
  },
  DATABASE_UNAVAILABLE: {
    status: 503,
    message: "暂时连接不上练习数据库",
    action: "请检查 Neon 项目状态和网络连接，稍后点击重新加载。",
  },
  PRACTICE_CREATE_FAILED: {
    status: 503,
    message: "今天的练习场次创建失败",
    action: "请点击重新加载；若仍失败，请检查数据库迁移和连接配置。",
  },
  QUESTION_NOT_FOUND: {
    status: 404,
    message: "这道题不存在或不属于当前账号",
    action: "请刷新每日一练，继续完成当前账号的题目。",
  },
  QUESTION_ALREADY_ANSWERED: {
    status: 409,
    message: "这道题已经作答",
    action: "答案已保存，请刷新后继续下一题。",
  },
  PRACTICE_UNAVAILABLE: {
    status: 500,
    message: "暂时无法加载每日一练",
    action: "请点击重新加载；若仍失败，请查看服务端日志中的具体错误。",
  },
};

function readErrorValue(error: unknown, key: "code" | "message"): string | null {
  if (!error || typeof error !== "object") return null;
  const value = (error as Record<string, unknown>)[key];
  if (typeof value === "string") return value;
  const cause = (error as Record<string, unknown>).cause;
  return cause === error ? null : readErrorValue(cause, key);
}

export function describePracticeError(error: unknown): PracticeErrorDetails {
  const errorCode = readErrorValue(error, "code");
  const errorMessage = readErrorValue(error, "message");
  let code: PracticeErrorCode = "PRACTICE_UNAVAILABLE";

  if (errorMessage === "NO_WORDS_AVAILABLE") code = "NO_LEARNED_WORDS";
  else if (errorMessage === "PRACTICE_CREATE_FAILED") code = "PRACTICE_CREATE_FAILED";
  else if (errorMessage === "QUESTION_NOT_FOUND") code = "QUESTION_NOT_FOUND";
  else if (errorMessage === "QUESTION_ALREADY_ANSWERED") code = "QUESTION_ALREADY_ANSWERED";
  else if (errorCode === "42P01" || errorCode === "42703") code = "DATABASE_MIGRATION_REQUIRED";
  else if (errorCode === "28P01" || errorCode === "28000") code = "DATABASE_CREDENTIALS_INVALID";
  else if (
    errorCode?.startsWith("08") ||
    ["ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "ENOTFOUND", "ETIMEDOUT", "CONNECT_TIMEOUT"].includes(
      errorCode ?? "",
    )
  ) {
    code = "DATABASE_UNAVAILABLE";
  }

  return { code, ...DETAILS[code] };
}
