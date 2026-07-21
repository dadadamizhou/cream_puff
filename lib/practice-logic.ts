import type { PracticeSummary, PracticeType } from "@/types/practice";

export const DAILY_PRACTICE_QUESTION_COUNT = 15;

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

export function createPracticePlan<T>(targets: T[], count = DAILY_PRACTICE_QUESTION_COUNT) {
  if (targets.length === 0 || count <= 0) return [];

  return Array.from({ length: count }, (_, position) => ({
    position,
    type: PRACTICE_TYPES[position % PRACTICE_TYPES.length],
    target: targets[position % targets.length],
  }));
}
