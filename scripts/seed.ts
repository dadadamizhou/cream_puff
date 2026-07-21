import { loadEnvFile } from "node:process";
import { notInArray, sql } from "drizzle-orm";
import { words } from "../db/schema";

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
};

async function loadWords(): Promise<SeedWord[]> {
  try {
    const response = await fetch("https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv", { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`source returned ${response.status}`);
    const csv = await response.text();
    const parsed: SeedWord[] = [];
    const seen = new Set<string>();
    for (const line of csv.split("\n").slice(1)) {
      const columns = parseCsvLine(line);
      const [spelling, phonetic, , translation] = columns;
      const tags = columns[7] ?? "";
      const normalized = spelling?.toLowerCase();
      if (!normalized || normalized.length < 2 || !/^[a-z][a-z-]*$/i.test(normalized) || !translation || !tags.split(/\s+/).includes("gk") || seen.has(normalized)) continue;
      seen.add(normalized);
      parsed.push({ spelling: normalized, phonetic: phonetic ?? "", definition: translation.replace(/\\n/g, "；"), example: "", exampleTranslation: "", memoryTip: "先读音，再回忆中文含义。" });
      if (parsed.length >= 3500) break;
    }
    if (parsed.length >= 3500) return parsed;
    throw new Error(`高中词表只有 ${parsed.length} 条，未达到 3500 条，已停止导入`);
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
      const batch = seedWords.slice(start, start + 250).map((word, offset) => ({
        ...word,
        position: start + offset + 1,
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
            position: sql`excluded.position`,
          },
        });
    }
  });

  console.log(`高中词库同步完成：共 ${seedWords.length} 条，已移除基础单字母词和历史占位词。`);
}

main().catch((error) => {
  console.error("词库种子失败：", error);
  process.exitCode = 1;
});
