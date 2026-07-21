import { createHash } from "node:crypto";

/**
 * The seed is deliberately tied to the user and assignment cycle. This makes
 * retries idempotent while giving every user a different permutation of the
 * same catalogue.
 */
export function getAssignmentSeed(userId: string, cycleKey: string) {
  return `${userId}:${cycleKey}:`;
}

export function getAssignmentOrderKey(seed: string, wordId: number) {
  return createHash("md5").update(`${seed}${wordId}`).digest("hex");
}

export function orderAssignmentCandidates<T extends { id: number }>(candidates: T[], userId: string, cycleKey: string) {
  const seed = getAssignmentSeed(userId, cycleKey);
  return [...candidates].sort((left, right) =>
    getAssignmentOrderKey(seed, left.id).localeCompare(getAssignmentOrderKey(seed, right.id)) || left.id - right.id,
  );
}
