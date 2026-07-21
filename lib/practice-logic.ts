import type { PracticeSummary, PracticeType } from "@/types/practice";

/**
 * Practice scales with the learned vocabulary instead of stopping at a fixed
 * count. Small libraries use every available word/type pair once; larger
 * libraries get at least two prompts per selected word, capped for fatigue.
 */
export const PREFERRED_MIN_PRACTICE_QUESTION_COUNT = 20;
export const MAX_PRACTICE_QUESTION_COUNT = 50;
export const MAX_PRACTICE_TARGET_COUNT = MAX_PRACTICE_QUESTION_COUNT / 2;

export const PRACTICE_TYPES: PracticeType[] = [
  "meaning_to_word",
  "word_to_meaning",
  "listening_choice",
  "listening_dictation",
  "translation_dictation",
];

export function normalizePracticeAnswer(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function getPracticeQuestionCount(targetCount: number) {
  if (targetCount <= 0) return 0;
  const availableUniquePrompts = targetCount * PRACTICE_TYPES.length;
  return Math.min(
    MAX_PRACTICE_QUESTION_COUNT,
    Math.max(Math.min(PREFERRED_MIN_PRACTICE_QUESTION_COUNT, availableUniquePrompts), targetCount * 2),
  );
}

export function summarizePracticeQuestions(
  questions: Array<{ selectedAnswer: string | null; isCorrect: boolean | null }>,
): PracticeSummary {
  const total = questions.length;
  const answered = questions.filter((question) => question.selectedAnswer !== null).length;
  const correct = questions.filter((question) => question.isCorrect === true).length;

  return {
    total,
    answered,
    correct,
    incorrect: answered - correct,
    remaining: total - answered,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    completed: total > 0 && answered === total,
  };
}

export function createPracticePlan<T>(targets: T[], count = getPracticeQuestionCount(targets.length)) {
  if (targets.length === 0 || count <= 0) return [];

  return Array.from({ length: count }, (_, position) => {
    const targetIndex = position % targets.length;
    const repetition = Math.floor(position / targets.length);
    return {
      position,
      type: PRACTICE_TYPES[(targetIndex + repetition) % PRACTICE_TYPES.length],
      target: targets[targetIndex],
    };
  });
}

export function createPracticePlanExtension<T extends { wordId: number }>(
  targets: T[],
  desiredCount: number,
  existing: Array<{ position: number; wordId: number; type: PracticeType }>,
) {
  const remainingCount = Math.max(0, desiredCount - existing.length);
  if (remainingCount === 0) return [];

  const existingPairs = new Set(existing.map((item) => `${item.wordId}:${item.type}`));
  const nextPosition = existing.reduce((highest, item) => Math.max(highest, item.position), -1) + 1;
  return createPracticePlan(targets, desiredCount)
    .filter((item) => !existingPairs.has(`${item.target.wordId}:${item.type}`))
    .slice(0, remainingCount)
    .map((item, index) => ({ ...item, position: nextPosition + index }));
}
