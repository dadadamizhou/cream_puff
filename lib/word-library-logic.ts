export type WordProgressStatus = "unlearned" | "learning" | "mastered";

export function getShanghaiDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getShanghaiWeekStart(date = new Date()) {
  const [year, month, day] = getShanghaiDateKey(date).split("-").map(Number);
  const localDateAsUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDateAsUtc.getUTCDay() || 7;
  localDateAsUtc.setUTCDate(localDateAsUtc.getUTCDate() - weekday + 1);
  return localDateAsUtc.toISOString().slice(0, 10);
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getShanghaiDayRange(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function getWordProgressStatus(reviewCount: number | null, masteredAt: Date | null): WordProgressStatus {
  if (masteredAt) return "mastered";
  if ((reviewCount ?? 0) > 0) return "learning";
  return "unlearned";
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
