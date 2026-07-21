import { describe, expect, it } from "vitest";
import { normalizeWordBooks } from "../lib/word-books";

describe("word book selection", () => {
  it("always restores the fixed learning progression", () => {
    expect(normalizeWordBooks(["cet4", "grade2", "grade1"])).toEqual(["grade1", "grade2", "cet4"]);
  });

  it("falls back to the complete progression for missing legacy settings", () => {
    expect(normalizeWordBooks(null)).toEqual(["grade1", "grade2", "grade3", "cet4"]);
    expect(normalizeWordBooks([])).toEqual(["grade1", "grade2", "grade3", "cet4"]);
  });
});
