import { loadEnvFile } from "node:process";
import { inArray, notInArray, sql } from "drizzle-orm";
import { wordBookEntries, words } from "../db/schema";
import { classifyDictionaryWords, MAX_HIGH_SCHOOL_WORDS, type ClassifiedDictionaryWord } from "../lib/word-book-classification";

try {
  loadEnvFile(".env");
} catch {
  // CI may provide environment variables directly.
}

type SeedWord = {
  spelling: string;
  phonetic: string;
  definition: string;
  example: string;
  exampleTranslation: string;
  memoryTip: string;
  tags: string[];
  frequencyRank: number;
};

async function loadWords(): Promise<ClassifiedDictionaryWord<SeedWord>[]> {
  try {
    const response = await fetch("https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv", { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`source returned ${response.status}`);
    const csv = await response.text();
    const parsed: SeedWord[] = [];
    for (const line of csv.split("\n").slice(1)) {
      const columns = parseCsvLine(line);
      const [spelling, phonetic, , translation] = columns;
      const tags = (columns[7] ?? "").split(/\s+/).filter(Boolean);
      const normalized = spelling?.toLowerCase();
      if (!normalized || normalized.length < 2 || !/^[a-z][a-z-]*$/i.test(normalized) || !translation || (!tags.includes("gk") && !tags.includes("cet4"))) continue;
      const ranks = [columns[8], columns[9]].map(Number).filter((rank) => Number.isFinite(rank) && rank > 0);
      parsed.push({
        spelling: normalized,
        phonetic: phonetic ?? "",
        definition: translation.replace(/\\n/g, "；"),
        example: "",
        exampleTranslation: "",
        memoryTip: "先读音，再回忆中文含义。",
        tags,
        frequencyRank: ranks.length ? Math.min(...ranks) : Number.MAX_SAFE_INTEGER,
      });
    }
    const classified = classifyDictionaryWords(parsed);
    const highSchoolCount = classified.filter((word) => word.wordBook !== "cet4").length;
    if (highSchoolCount === MAX_HIGH_SCHOOL_WORDS && classified.some((word) => word.wordBook === "cet4")) return classified;
    throw new Error(`可用高中词汇只有 ${highSchoolCount} 条，或缺少四级拓展词，已停止导入`);
  } catch (error) {
    throw new Error(`无法取得真实高中词表，数据库未改动：${error instanceof Error ? error.message : "未知错误"}`);
  }
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { values.push(value.trim()); value = ""; continue; }
    value += char;
  }
  values.push(value.trim());
  return values;
}

async function main() {
  const { database } = await import("../db");
  const seedWords = await loadWords();
  const spellings = seedWords.map((word) => word.spelling);

  await database.transaction(async (tx) => {
    await tx.delete(words).where(notInArray(words.spelling, spellings));
    for (let start = 0; start < seedWords.length; start += 250) {
      const batch = seedWords.slice(start, start + 250).map((word) => ({
        spelling: word.spelling,
        phonetic: word.phonetic,
        definition: word.definition,
        example: word.example,
        exampleTranslation: word.exampleTranslation,
        memoryTip: word.memoryTip,
        wordBook: word.wordBook,
        position: word.position,
      }));
      await tx
        .insert(words)
        .values(batch)
        .onConflictDoUpdate({
          target: words.spelling,
          set: {
            phonetic: sql`excluded.phonetic`,
            definition: sql`excluded.definition`,
            example: sql`excluded.example`,
            exampleTranslation: sql`excluded.example_translation`,
            memoryTip: sql`excluded.memory_tip`,
            wordBook: sql`excluded.word_book`,
            position: sql`excluded.position`,
          },
        });
    }

    await tx.delete(wordBookEntries);
    for (let start = 0; start < seedWords.length; start += 250) {
      const batch = seedWords.slice(start, start + 250);
      const storedWords = await tx
        .select({ id: words.id, spelling: words.spelling })
        .from(words)
        .where(inArray(words.spelling, batch.map((word) => word.spelling)));
      const ids = new Map(storedWords.map((word) => [word.spelling, word.id]));
      const memberships = batch.flatMap((word) => word.wordBooks.map((wordBook) => ({
        wordId: ids.get(word.spelling)!,
        wordBook,
        position: word.position,
      })));
      if (memberships.length) await tx.insert(wordBookEntries).values(memberships);
    }
  });

  const counts = seedWords.reduce<Record<string, number>>((result, word) => {
    for (const wordBook of word.wordBooks) result[wordBook] = (result[wordBook] ?? 0) + 1;
    return result;
  }, {});
  console.log(`分级词库同步完成：高一 ${counts.grade1 ?? 0}，高二 ${counts.grade2 ?? 0}，高三 ${counts.grade3 ?? 0}，完整四级 ${counts.cet4 ?? 0}。`);
}

main().catch((error) => {
  console.error("词库种子失败：", error);
  process.exitCode = 1;
});
