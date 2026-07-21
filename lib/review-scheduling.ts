import { getNextReviewAt, getNextStage, STAGES, type Rating } from "./scheduler";
import type { ReviewSource } from "../types/study";

export function resolveReviewSchedule(args: {
  source: ReviewSource;
  stage: number;
  rating: Rating;
  currentNextReviewAt: Date;
  currentMasteredAt: Date | null;
  now: Date;
}) {
  const scheduledStage = getNextStage(args.stage, args.rating);
  const scheduledAt = getNextReviewAt(args.stage, args.rating, args.now);

  if (args.source === "optional-review" && (args.rating === "good" || args.rating === "easy")) {
    return {
      nextStage: args.stage,
      nextReviewAt: args.currentNextReviewAt,
      masteredAt: args.currentMasteredAt,
    };
  }

  const nextReviewAt = args.source === "optional-review"
    ? new Date(Math.min(args.currentNextReviewAt.getTime(), scheduledAt.getTime()))
    : scheduledAt;
  const masteredAt = scheduledStage >= STAGES.length - 1 ? (args.currentMasteredAt ?? args.now) : null;

  return { nextStage: scheduledStage, nextReviewAt, masteredAt };
}
