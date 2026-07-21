export const STAGES = [0, 1, 2, 3, 4, 5, 6];
export const STAGE_INTERVALS_DAYS = [0, 1, 2, 4, 7, 15, 30];
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export type Rating = "again" | "hard" | "good" | "easy";

export function getNextReviewAt(stage: number, rating: Rating, now = new Date()) {
  if (rating === "again") return new Date(now.getTime() + 10 * MINUTE);
  if (rating === "hard") return new Date(now.getTime() + DAY);
  const stageOffset = rating === "easy" ? 2 : 1;
  const nextStage = Math.min(STAGES.length - 1, stage + stageOffset);
  return new Date(now.getTime() + Math.max(1, STAGE_INTERVALS_DAYS[nextStage]) * DAY);
}

export function getNextStage(stage: number, rating: Rating) {
  if (rating === "again") return Math.max(0, stage - 1);
  if (rating === "easy") return Math.min(STAGES.length - 1, stage + 2);
  if (rating === "good") return Math.min(STAGES.length - 1, stage + 1);
  return stage;
}
