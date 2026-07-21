import type { WordBookId } from "@/lib/word-books";

export type StudyTask = {
  id: number;
  wordId: number;
  spelling: string;
  phonetic: string;
  definition: string;
  example: string;
  exampleTranslation: string;
  memoryTip: string;
  wordBook: WordBookId;
  stage: number;
  reviewCount: number;
  nextReviewAt: string;
  firstLearnedAt: string;
};

export type OptionalStudyMode = "review" | "advance";
export type ReviewSource = "today" | "optional-review" | "advance";

export type OptionalStudyData = {
  mode: OptionalStudyMode;
  targetDate: string | null;
  tasks: StudyTask[];
  message: string | null;
};

export type TodayData = {
  date: string;
  weekStart: string;
  tasks: StudyTask[];
  checkin: { completedCount: number; targetCount: number; fullyCompleted: boolean };
  plan: { weeklyGoal: number; dailyAverage: number; enabledWordBooks: WordBookId[]; currentWordBook: WordBookId | null };
  week: { scheduled: number; learned: number; mastered: number; goal: number };
  activeDays: { date: string; fullyCompleted: boolean }[];
  streak: number;
  stageCounts: { stage: number; count: number }[];
  overall: { learned: number; mastered: number; remaining: number };
};
