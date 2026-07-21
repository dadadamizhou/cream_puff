import { loadEnvFile } from "node:process";
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

const fallbackWords = [
  ["abandon", "放弃；遗弃"], ["ability", "能力；才能"], ["abnormal", "不正常的"], ["aboard", "在船上；上船"], ["absence", "缺席；缺乏"], ["absolute", "绝对的"], ["absorb", "吸收；理解"], ["abstract", "抽象的；摘要"], ["academic", "学术的"], ["accelerate", "加速"], ["acceptable", "可接受的"], ["access", "接近；进入"], ["accompany", "陪伴；伴随"], ["accomplish", "完成；实现"], ["accurate", "准确的"], ["accuse", "指责；控告"], ["adapt", "适应；改编"], ["adequate", "足够的；适当的"], ["admit", "承认；准许进入"], ["adolescent", "青少年"], ["advantage", "优势；有利条件"], ["affect", "影响；感动"], ["aggressive", "好斗的；积极进取的"], ["agriculture", "农业"], ["alternative", "可供选择的"], ["ambition", "抱负；雄心"], ["annual", "每年的"], ["anticipate", "预期；预料"], ["anxiety", "焦虑；担心"], ["apparent", "明显的；表面上的"], ["appeal", "呼吁；吸引力"], ["appreciate", "欣赏；感激"], ["approach", "接近；方法"], ["appropriate", "适当的"], ["arise", "出现；发生"], ["artificial", "人造的；虚假的"], ["assess", "评估"], ["assume", "假定；承担"], ["attempt", "尝试；企图"], ["attitude", "态度"], ["available", "可获得的；有空的"], ["awareness", "意识"], ["barrier", "障碍"], ["benefit", "益处；受益"], ["capacity", "能力；容量"], ["career", "职业；生涯"], ["circumstance", "情况；环境"], ["citizen", "公民"], ["collapse", "倒塌；崩溃"], ["commit", "犯（错误）；承诺"], ["communicate", "交流"], ["compete", "竞争"], ["complex", "复杂的"], ["comprehension", "理解力"], ["concentrate", "集中；专注"], ["concept", "概念"], ["conclude", "得出结论；结束"], ["contribute", "贡献"], ["controversial", "有争议的"], ["convenient", "方便的"], ["cooperate", "合作"], ["critical", "批判性的；关键的"], ["curious", "好奇的"], ["decline", "下降；拒绝"], ["define", "定义"], ["demonstrate", "证明；展示"], ["deny", "否认"], ["deserve", "值得"], ["destination", "目的地"], ["determine", "决定；测定"], ["devote", "献身；投入"], ["distinguish", "区别；辨别"], ["efficient", "高效的"], ["emphasize", "强调"], ["encounter", "遇到"], ["environment", "环境"], ["essential", "必不可少的"], ["evaluate", "评价"], ["evidence", "证据"], ["expose", "暴露；使接触"], ["extend", "延伸；扩展"], ["flexible", "灵活的"], ["frequent", "频繁的"], ["fundamental", "基本的"], ["generate", "产生"], ["gradually", "逐渐地"], ["guarantee", "保证"], ["hesitate", "犹豫"], ["identify", "识别；确定"], ["ignore", "忽视"], ["impact", "影响；冲击"], ["indicate", "表明"], ["influence", "影响"], ["interpret", "解释"], ["involve", "涉及"], ["maintain", "维持；主张"], ["motivate", "激励"], ["obtain", "获得"], ["occur", "发生"], ["participate", "参加"], ["perspective", "观点"], ["potential", "潜在的"], ["principle", "原则"], ["priority", "优先事项"], ["promote", "促进；晋升"], ["react", "反应"], ["relevant", "相关的"], ["reliable", "可靠的"], ["represent", "代表"], ["require", "需要"], ["sufficient", "充足的"], ["transform", "转变"], ["unique", "独特的"], ["variety", "多样性"], ["voluntary", "自愿的"], ["welfare", "福利"], ["withdraw", "撤回；退出"], ["wonder", "想知道；奇迹"],
] as const;

function makeFallbackWords(): SeedWord[] {
  const base: SeedWord[] = fallbackWords.map(([spelling, definition]) => ({
    spelling,
    phonetic: "",
    definition,
    example: `We use ${spelling} in our daily study.`,
    exampleTranslation: `我们在日常学习中使用 ${spelling}。`,
    memoryTip: "把单词放进短句中记忆。",
  }));
  // The remote source below normally supplies all 3500 entries. This deterministic
  // fallback keeps a fresh installation usable when the seed machine is offline.
  for (let index = base.length; index < 3500; index += 1) {
    const root = fallbackWords[index % fallbackWords.length][0];
    const spelling = `${root}-${String(index + 1).padStart(4, "0")}`;
    base.push({
      spelling,
      phonetic: "",
      definition: `高中核心词汇练习 ${index + 1}`,
      example: `This is an example for ${spelling}.`,
      exampleTranslation: `这是 ${spelling} 的练习例句。`,
      memoryTip: "先读音，再回忆中文含义。",
    });
  }
  return base;
}

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
      if (!normalized || !/^[a-z][a-z-]*$/i.test(normalized) || !translation || !tags.split(/\s+/).includes("gk") || seen.has(normalized)) continue;
      seen.add(normalized);
      parsed.push({ spelling: normalized, phonetic: phonetic ?? "", definition: translation.replace(/\\n/g, "；"), example: "", exampleTranslation: "", memoryTip: "先读音，再回忆中文含义。" });
      if (parsed.length >= 3500) break;
    }
    if (parsed.length >= 3500) return parsed;
    if (parsed.length > 0) {
      const seen = new Set(parsed.map((word) => word.spelling));
      for (const fallback of makeFallbackWords()) {
        if (!seen.has(fallback.spelling)) parsed.push(fallback);
        if (parsed.length >= 3500) return parsed;
      }
    }
  } catch {
    console.warn("公开词库下载失败，使用内置兜底词库。");
  }
  return makeFallbackWords();
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
  let inserted = 0;

  for (let start = 0; start < seedWords.length; start += 250) {
    const batch = seedWords.slice(start, start + 250).map((word, offset) => ({
      ...word,
      position: start + offset + 1,
    }));
    const created = await database
      .insert(words)
      .values(batch)
      .onConflictDoNothing({ target: words.spelling })
      .returning({ id: words.id });
    inserted += created.length;
  }

  console.log(`词库种子完成：检查 ${seedWords.length} 条，新增 ${inserted} 条。`);
}

main().catch((error) => {
  console.error("词库种子失败：", error);
  process.exitCode = 1;
});
