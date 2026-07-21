import { create } from "zustand";

type PracticeState = {
  currentIndex: number;
  selectedAnswer: string;
  setCurrentIndex: (index: number) => void;
  setSelectedAnswer: (answer: string) => void;
  begin: (index: number) => void;
  next: (index: number) => void;
  reset: () => void;
};

export const usePracticeStore = create<PracticeState>((set) => ({
  currentIndex: 0,
  selectedAnswer: "",
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setSelectedAnswer: (selectedAnswer) => set({ selectedAnswer }),
  begin: (currentIndex) => set({ currentIndex, selectedAnswer: "" }),
  next: (currentIndex) => set({ currentIndex, selectedAnswer: "" }),
  reset: () => set({ currentIndex: 0, selectedAnswer: "" }),
}));
