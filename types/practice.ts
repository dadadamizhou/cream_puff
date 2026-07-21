export type PracticeType =
  | "meaning_to_word"
  | "word_to_meaning"
  | "listening_choice"
  | "listening_dictation"
  | "translation_dictation";

export type PracticeQuestion = {
  id: number;
  type: PracticeType;
  prompt: string;
  audioText: string | null;
  options: string[];
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  correctAnswer: string | null;
  explanation: {
    spelling: string;
    phonetic: string;
    definition: string;
    example: string;
  } | null;
};

export type PracticeSummary = {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  remaining: number;
  accuracy: number;
  completed: boolean;
};

export type PracticeTodayData = {
  practice: {
    id: number;
    date: string;
    status: "in_progress" | "completed";
  };
  questions: PracticeQuestion[];
  summary: PracticeSummary;
};

export type PracticeAnswerData = {
  question: PracticeQuestion;
  summary: PracticeSummary;
  scheduling: {
    affected: boolean;
    userWordId: number | null;
    stage: number | null;
    nextReviewAt: string | null;
  };
};

export type PracticeApiError = {
  code?: string;
  message?: string;
  action?: string;
};
