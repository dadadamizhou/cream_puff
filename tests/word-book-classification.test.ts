import { describe, expect, it } from "vitest";
import { classifyDictionaryWords, type DictionaryWord } from "../lib/word-book-classification";

function entry(spelling: string, frequencyRank: number, tags: string[]): DictionaryWord {
  return { spelling, frequencyRank, tags };
}

describe("word book classification", () => {
  it("splits high-school words by frequency and keeps CET4 overlap in the earlier book", () => {
    const result = classifyDictionaryWords([
      entry("rare", 40, ["gk"]),
      entry("basic", 1, ["gk", "cet4"]),
      entry("middle", 20, ["gk"]),
      entry("college", 10, ["cet4"]),
    ]);

    expect(result.map(({ spelling, wordBook }) => [spelling, wordBook])).toEqual([
      ["basic", "grade1"],
      ["middle", "grade2"],
      ["rare", "grade3"],
      ["college", "cet4"],
    ]);
  });

  it("uses stable positions inside each book instead of alphabetical source order", () => {
    const result = classifyDictionaryWords([
      entry("zoo", 2, ["gk"]),
      entry("apple", 3, ["gk"]),
      entry("move", 1, ["gk"]),
    ]);
    expect(result.map(({ spelling, position }) => [spelling, position])).toEqual([
      ["move", 1],
      ["zoo", 1],
      ["apple", 1],
    ]);
  });
});
