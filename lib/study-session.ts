import type { StudyTask } from "@/types/study";

export const DEFAULT_BATCH_SIZE = 5;

export type RecallDirection = "meaning" | "spelling";

export function partitionStudyTasks(tasks: StudyTask[]) {
  return {
    reviews: tasks.filter((task) => task.reviewCount > 0),
    newWords: tasks.filter((task) => task.reviewCount === 0),
  };
}

export function chunkStudyTasks(tasks: StudyTask[], size = DEFAULT_BATCH_SIZE) {
  if (!Number.isInteger(size) || size < 1) throw new Error("INVALID_BATCH_SIZE");
  const batches: StudyTask[][] = [];
  for (let index = 0; index < tasks.length; index += size) {
    batches.push(tasks.slice(index, index + size));
  }
  return batches;
}

export function getRecallDirection(task: StudyTask): RecallDirection {
  return task.stage >= 2 || task.reviewCount >= 3 ? "spelling" : "meaning";
}

export function normalizeSpelling(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}

export function isSpellingCorrect(answer: string, spelling: string) {
  return normalizeSpelling(answer) === normalizeSpelling(spelling);
}
