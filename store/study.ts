import { create } from "zustand";

type StudyState = {
  currentIndex: number;
  startedAt: number | null;
  setCurrentIndex: (index: number) => void;
  startTask: () => void;
  getElapsedMs: () => number;
  reset: () => void;
};

export const useStudyStore = create<StudyState>((set, get) => ({
  currentIndex: 0,
  startedAt: null,
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  startTask: () => set({ startedAt: Date.now() }),
  getElapsedMs: () => {
    const startedAt = get().startedAt;
    return startedAt ? Date.now() - startedAt : 0;
  },
  reset: () => set({ currentIndex: 0, startedAt: null }),
}));
