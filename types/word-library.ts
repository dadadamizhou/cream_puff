import type { WordBookId } from "@/lib/word-books";

export type WordLibraryStatus = "all" | "learned" | "learning" | "mastered" | "unlearned" | "scheduled";
export type WordLibraryScope = "all" | "week" | "day";
export type WordLibraryBook = "all" | WordBookId;

export type WordLibraryItem = {
  id: number;
  spelling: string;
  phonetic: string;
  definition: string;
  wordBook: WordBookId;
  stage: number | null;
  reviewCount: number;
  assignedWeek: string | null;
  status: "unlearned" | "learning" | "mastered";
};

export type WordLibraryData = {
  summary: {
    total: number;
    learned: number;
    learning: number;
    mastered: number;
    remaining: number;
    scheduledThisWeek: number;
  };
  items: WordLibraryItem[];
  filters: {
    status: WordLibraryStatus;
    book: WordLibraryBook;
    scope: WordLibraryScope;
    q: string;
    date: string | null;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
