export type StudyTask = {
  id: number;
  wordId: number;
  spelling: string;
  phonetic: string;
  definition: string;
  example: string;
  exampleTranslation: string;
  memoryTip: string;
  stage: number;
  reviewCount: number;
  nextReviewAt: string;
  firstLearnedAt: string;
};

export type TodayData = {
  date: string;
  weekStart: string;
  tasks: StudyTask[];
  checkin: { completedCount: number; targetCount: number; fullyCompleted: boolean };
  plan: { weeklyGoal: number; dailyAverage: number };
  week: { scheduled: number; learned: number; mastered: number; goal: number };
  activeDays: { date: string; fullyCompleted: boolean }[];
  streak: number;
  stageCounts: { stage: number; count: number }[];
  overall: { learned: number; mastered: number };
};
