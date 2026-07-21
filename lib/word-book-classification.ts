import type { WordBookId } from "@/lib/word-books";

export const MAX_HIGH_SCHOOL_WORDS = 3500;

export type DictionaryWord = {
  spelling: string;
  tags: string[];
  frequencyRank: number;
};

export type ClassifiedDictionaryWord<T extends DictionaryWord = DictionaryWord> = T & {
  wordBook: WordBookId;
  wordBooks: WordBookId[];
  position: number;
};

function byFrequency(a: DictionaryWord, b: DictionaryWord) {
  return a.frequencyRank - b.frequencyRank || a.spelling.localeCompare(b.spelling);
}

export function classifyDictionaryWords<T extends DictionaryWord>(entries: T[]): ClassifiedDictionaryWord<T>[] {
  const unique = new Map<string, T>();
  for (const entry of entries) {
    if (!unique.has(entry.spelling)) unique.set(entry.spelling, entry);
  }

  const highSchool = [...unique.values()].filter((entry) => entry.tags.includes("gk")).sort(byFrequency).slice(0, MAX_HIGH_SCHOOL_WORDS);
  const firstBoundary = Math.ceil(highSchool.length / 3);
  const secondBoundary = Math.ceil(highSchool.length * 2 / 3);
  const highSchoolSet = new Set(highSchool.map((entry) => entry.spelling));
  const cet4Only = [...unique.values()]
    .filter((entry) => entry.tags.includes("cet4") && !highSchoolSet.has(entry.spelling))
    .sort(byFrequency);

  const classifiedHighSchool = highSchool.map((entry, index) => {
    const wordBook = (index < firstBoundary ? "grade1" : index < secondBoundary ? "grade2" : "grade3") as WordBookId;
    return {
      ...entry,
      wordBook,
      wordBooks: entry.tags.includes("cet4") ? [wordBook, "cet4" as const] : [wordBook],
      position: index < firstBoundary ? index + 1 : index < secondBoundary ? index - firstBoundary + 1 : index - secondBoundary + 1,
    };
  });
  const classifiedCet4 = cet4Only.map((entry, index) => ({ ...entry, wordBook: "cet4" as const, wordBooks: ["cet4" as const], position: index + 1 }));

  return [...classifiedHighSchool, ...classifiedCet4];
}
