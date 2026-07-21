export const DAY_MS = 24 * 60 * 60 * 1000;

export function getShanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getShanghaiDayStart(date = new Date()) {
  return new Date(`${getShanghaiDateKey(date)}T00:00:00+08:00`);
}

export function getShanghaiWeekStart(date = new Date()) {
  const [year, month, day] = getShanghaiDateKey(date).split("-").map(Number);
  const localDateAsUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDateAsUtc.getUTCDay() || 7;
  localDateAsUtc.setUTCDate(localDateAsUtc.getUTCDate() - weekday + 1);
  return localDateAsUtc.toISOString().slice(0, 10);
}

export function getDaysSinceShanghaiMonday(date = new Date()) {
  const [year, month, day] = getShanghaiDateKey(date).split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
  return weekday - 1;
}

export function getCumulativeWeeklyTarget(weeklyGoal: number, date: Date) {
  const elapsedDays = getDaysSinceShanghaiMonday(date) + 1;
  return Math.min(weeklyGoal, Math.ceil((weeklyGoal * elapsedDays) / 7));
}

export function getTomorrowAssignmentPlan(now: Date, weeklyGoal: number, alreadyAssigned: number) {
  const start = new Date(getShanghaiDayStart(now).getTime() + DAY_MS);
  const cumulativeTarget = getCumulativeWeeklyTarget(weeklyGoal, start);
  return {
    date: getShanghaiDateKey(start),
    start,
    weekStart: getShanghaiWeekStart(start),
    cumulativeTarget,
    needNew: Math.max(0, cumulativeTarget - alreadyAssigned),
  };
}

export function getDailyCheckinCounts(completedWordIds: number[], dueWordIds: number[]) {
  const completed = new Set(completedWordIds);
  const target = new Set([...completed, ...dueWordIds]);
  return {
    completedCount: completed.size,
    targetCount: target.size,
    fullyCompleted: target.size > 0 && completed.size >= target.size,
  };
}
