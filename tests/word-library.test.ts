import { describe, expect, it } from "vitest";
import { wordLibraryQuerySchema } from "../lib/validation/words";
import {
  escapeLikePattern,
  getShanghaiDayRange,
  getShanghaiWeekStart,
  getWordProgressStatus,
  isValidDateKey,
} from "../lib/word-library-logic";

describe("word library query validation", () => {
  it("applies stable defaults and coerces URL pagination values", () => {
    expect(wordLibraryQuerySchema.parse({})).toEqual({
      status: "all",
      book: "all",
      scope: "all",
      q: "",
      page: 1,
      pageSize: 30,
    });
    expect(wordLibraryQuerySchema.parse({ page: "2", pageSize: "50" })).toMatchObject({ page: 2, pageSize: 50 });
  });

  it("rejects unsupported filters and unsafe pagination sizes", () => {
    expect(wordLibraryQuerySchema.safeParse({ status: "forgotten" }).success).toBe(false);
    expect(wordLibraryQuerySchema.safeParse({ book: "junior" }).success).toBe(false);
    expect(wordLibraryQuerySchema.safeParse({ scope: "today" }).success).toBe(false);
    expect(wordLibraryQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(wordLibraryQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });

  it("requires a real calendar date for the day scope", () => {
    expect(wordLibraryQuerySchema.safeParse({ scope: "day" }).success).toBe(false);
    expect(wordLibraryQuerySchema.safeParse({ scope: "day", date: "2026-02-30" }).success).toBe(false);
    expect(wordLibraryQuerySchema.safeParse({ scope: "day", date: "2026-07-21" }).success).toBe(true);
  });
});

describe("word library progress", () => {
  it("does not count an assigned but unreviewed word as learned", () => {
    expect(getWordProgressStatus(0, null)).toBe("unlearned");
    expect(getWordProgressStatus(null, null)).toBe("unlearned");
  });

  it("distinguishes active learning from mastered words", () => {
    expect(getWordProgressStatus(1, null)).toBe("learning");
    expect(getWordProgressStatus(8, new Date("2026-07-01T00:00:00Z"))).toBe("mastered");
  });
});

describe("Shanghai week boundaries", () => {
  it("starts a new week at Monday 00:00 in Asia/Shanghai", () => {
    expect(getShanghaiWeekStart(new Date("2026-07-19T15:59:59Z"))).toBe("2026-07-13");
    expect(getShanghaiWeekStart(new Date("2026-07-19T16:00:00Z"))).toBe("2026-07-20");
  });

  it("escapes SQL LIKE wildcard characters in literal searches", () => {
    expect(escapeLikePattern("50%_off\\today")).toBe("50\\%\\_off\\\\today");
  });

  it("builds Shanghai-local day boundaries as an exclusive UTC range", () => {
    expect(isValidDateKey("2026-07-21")).toBe(true);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    const range = getShanghaiDayRange("2026-07-21");
    expect(range.start.toISOString()).toBe("2026-07-20T16:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-21T16:00:00.000Z");
  });
});
