import { WordLibrary } from "@/components/words/word-library";
import { isValidDateKey } from "@/lib/word-library-logic";
import type { WordLibraryBook, WordLibraryScope, WordLibraryStatus } from "@/types/word-library";
import { WORD_BOOK_IDS } from "@/lib/word-books";

const STATUSES = new Set<WordLibraryStatus>(["all", "learned", "learning", "mastered", "unlearned", "scheduled"]);

export default async function WordsPage({ searchParams }: { searchParams: Promise<{ status?: string; scope?: string; date?: string; book?: string }> }) {
  const params = await searchParams;
  const status = STATUSES.has(params.status as WordLibraryStatus) ? params.status as WordLibraryStatus : "all";
  const date = params.date && isValidDateKey(params.date) ? params.date : null;
  const scope: WordLibraryScope = params.scope === "day" && date ? "day" : params.scope === "week" ? "week" : "all";
  const book: WordLibraryBook = WORD_BOOK_IDS.includes(params.book as typeof WORD_BOOK_IDS[number]) ? params.book as WordLibraryBook : "all";
  return <WordLibrary initialStatus={status} initialScope={scope} initialDate={scope === "day" ? date : null} initialBook={book} />;
}
