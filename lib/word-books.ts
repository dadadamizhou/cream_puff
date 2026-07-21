export const WORD_BOOK_IDS = ["grade1", "grade2", "grade3", "cet4"] as const;

export type WordBookId = typeof WORD_BOOK_IDS[number];

export const WORD_BOOKS: ReadonlyArray<{
  id: WordBookId;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  { id: "grade1", label: "高一基础", shortLabel: "高一", description: "高中 3500 词中最常用的一层" },
  { id: "grade2", label: "高二进阶", shortLabel: "高二", description: "在基础词之上扩展阅读和表达" },
  { id: "grade3", label: "高三冲刺", shortLabel: "高三", description: "高中 3500 词中的进阶与难词" },
  { id: "cet4", label: "四级拓展", shortLabel: "四级", description: "完整四级成员，含与高中词重叠的词" },
] as const;

const WORD_BOOK_SET = new Set<string>(WORD_BOOK_IDS);

export function isWordBookId(value: unknown): value is WordBookId {
  return typeof value === "string" && WORD_BOOK_SET.has(value);
}

export function normalizeWordBooks(value: unknown): WordBookId[] {
  if (!Array.isArray(value)) return [...WORD_BOOK_IDS];
  const selected = new Set(value.filter(isWordBookId));
  const ordered = WORD_BOOK_IDS.filter((id) => selected.has(id));
  return ordered.length ? ordered : [...WORD_BOOK_IDS];
}

export function getWordBook(id: WordBookId) {
  return WORD_BOOKS.find((book) => book.id === id) ?? WORD_BOOKS[0];
}
