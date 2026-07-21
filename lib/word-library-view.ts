import type { WordLibraryBook, WordLibraryScope, WordLibraryStatus } from "@/types/word-library";

export type WordLibraryViewState = {
  status: WordLibraryStatus;
  book: WordLibraryBook;
  scope: WordLibraryScope;
  date: string | null;
  query: string;
  page: number;
};

export type WordLibraryViewAction =
  | { type: "status"; status: WordLibraryStatus }
  | { type: "book"; book: WordLibraryBook }
  | { type: "search"; query: string }
  | { type: "showAll" }
  | { type: "page"; page: number };

export function wordLibraryViewReducer(state: WordLibraryViewState, action: WordLibraryViewAction): WordLibraryViewState {
  switch (action.type) {
    case "status":
      return {
        ...state,
        status: action.status,
        scope: action.status === "scheduled" ? "week" : "all",
        date: null,
        page: 1,
      };
    case "book":
      return { ...state, book: action.book, page: 1 };
    case "search":
      return { ...state, query: action.query.trim(), page: 1 };
    case "showAll":
      return {
        ...state,
        status: state.status === "scheduled" ? "all" : state.status,
        scope: "all",
        date: null,
        page: 1,
      };
    case "page":
      return { ...state, page: Math.max(1, action.page) };
  }
}

export function buildWordLibraryEndpoint(state: WordLibraryViewState, pageSize = 30) {
  const params = new URLSearchParams({
    status: state.status,
    book: state.book,
    scope: state.scope,
    q: state.query,
    page: String(state.page),
    pageSize: String(pageSize),
  });
  if (state.scope === "day" && state.date) params.set("date", state.date);
  return `/api/words?${params.toString()}`;
}
