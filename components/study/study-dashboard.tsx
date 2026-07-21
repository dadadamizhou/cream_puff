"use client";

import { useState } from "react";
import useSWR from "swr";
import { BookOpen, CalendarCheck2, Check, ChevronRight, Flame, LoaderCircle, Mic2, Play, RotateCcw, Sparkles, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/store/study";
import type { StudyTask, TodayData } from "@/types/study";

const fetcher = (url: string) => api.get<TodayData>(url).then((response) => response.data);

export function StudyDashboard() {
  const { data, error, isLoading, mutate } = useSWR("/api/study/today", fetcher, { revalidateOnFocus: false });
  const [session, setSession] = useState<StudyTask[] | null>(null);
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={() => mutate()} />;
  if (session) return <StudySession tasks={session} onClose={() => { setSession(null); mutate(); }} onComplete={() => { setSession(null); mutate(); }} />;

  const totalDone = data.checkin.completedCount;
  const progress = Math.min(100, Math.round((data.week.assigned / Math.max(1, data.week.goal)) * 100));
  return <div className="pb-4"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm text-muted">今天也别忘了开口</p><h1 className="mt-1 text-2xl font-bold tracking-tight">今日学习</h1></div><div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><Flame className="size-4 fill-current" />{data.streak} 天</div></div>
    <section className="relative overflow-hidden rounded-2xl bg-[#173d85] p-5 text-white shadow-lg shadow-blue-200/60 dark:shadow-none"><div className="absolute -right-8 -top-12 size-32 rounded-full border-[24px] border-white/10" /><div className="relative"><div className="mb-8 flex items-center justify-between"><span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold">艾宾浩斯 · 第 {Math.min(7, new Date().getDay() || 7)} 天</span><Sparkles className="size-5 text-blue-200" /></div><p className="text-sm text-blue-100">今天待完成</p><div className="mt-1 flex items-end gap-2"><strong className="text-4xl tracking-tight">{data.tasks.length}</strong><span className="mb-1 text-sm text-blue-100">个词</span></div><p className="mt-2 text-xs text-blue-100">预计 {Math.max(2, Math.ceil(data.tasks.length * 0.45))} 分钟 · 已完成 {totalDone} 次复习</p><button disabled={!data.tasks.length} onClick={() => { useStudyStore.getState().reset(); useStudyStore.getState().startTask(); setSession(data.tasks); }} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-bold text-[#173d85] transition hover:bg-blue-50 disabled:opacity-70">{data.tasks.length ? <><Play className="size-4 fill-current" />开始跟读</> : <><Check className="size-4" />今日任务已完成</>}</button></div></section>
    <WeekStrip activeDays={data.activeDays} />
    <section className="mt-5 rounded-2xl border border-line bg-card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-brand">本周计划</p><h2 className="mt-1 font-bold">稳稳拿下 {data.week.goal} 个词</h2></div><span className="text-sm font-bold text-brand">{progress}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-4 grid grid-cols-3 divide-x divide-line text-center"><Stat value={data.week.assigned} label="已加入" /><Stat value={data.week.mastered} label="已掌握" /><Stat value={Math.max(0, data.week.goal - data.week.assigned)} label="待学习" /></div></section>
    <section className="mt-5 flex items-center gap-4 rounded-2xl border border-line bg-card p-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><BookOpen className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">记忆小提示</p><p className="mt-1 text-xs leading-5 text-muted">先听音并大声跟读，再看释义。一次主动回忆比反复浏览更有效。</p></div><ChevronRight className="size-4 shrink-0 text-muted" /></section>
  </div>;
}

function StudySession({ tasks, onClose, onComplete }: { tasks: StudyTask[]; onClose: () => void; onComplete: () => void }) {
  const { currentIndex, setCurrentIndex, startTask, getElapsedMs } = useStudyStore();
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [recognized, setRecognized] = useState<string | null>(null);
  const task = tasks[currentIndex];
  if (!task) return <CompleteState count={tasks.length} onDone={onComplete} />;
  const pct = Math.round((currentIndex / tasks.length) * 100);

  function speak() { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(task.spelling); utterance.lang = "en-US"; utterance.rate = 0.82; window.speechSynthesis.speak(utterance); }
  function listen() {
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.info("当前浏览器不支持语音识别，可以跟读后直接自评"); return; }
    const recognition = new SpeechRecognition(); recognition.lang = "en-US"; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.onresult = (event) => { const text = event.results[0][0].transcript; setRecognized(text); }; recognition.onerror = () => toast.error("没有听清，再试一次吧"); recognition.start();
  }
  async function rate(rating: "again" | "hard" | "good" | "easy") {
    setSubmitting(true);
    try { await api.post("/api/study/review", { userWordId: task.id, rating, pronunciationMatched: recognized ? normalize(recognized) === normalize(task.spelling) : undefined, durationMs: getElapsedMs() }); setRevealed(false); setRecognized(null); startTask(); setCurrentIndex(currentIndex + 1); }
    catch { toast.error("记录失败，请检查网络后重试"); }
    finally { setSubmitting(false); }
  }
  return <div className="mx-auto max-w-xl"><header className="mb-5 flex items-center gap-4"><button onClick={onClose} aria-label="退出学习" className="grid size-10 place-items-center rounded-xl bg-card text-muted"><X className="size-5" /></button><div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div><span className="w-12 text-right text-xs font-semibold text-muted">{currentIndex + 1}/{tasks.length}</span></header>
    <article className="min-h-[410px] rounded-2xl border border-line bg-card p-6 text-center shadow-sm"><span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand">{task.reviewCount ? `第 ${task.stage + 1} 阶复习` : "本周新词"}</span><h1 className="mt-8 break-all text-[clamp(2.25rem,12vw,4rem)] font-bold tracking-normal">{task.spelling}</h1><p className="mt-2 min-h-6 text-sm text-muted">{task.phonetic || "点击发音，先听后读"}</p><div className="mt-6 flex justify-center gap-3"><button onClick={speak} aria-label="播放单词发音" className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-lg shadow-blue-200"><Volume2 className="size-5" /></button><button onClick={listen} aria-label="开始跟读识别" className="grid size-12 place-items-center rounded-full border border-line bg-card text-foreground"><Mic2 className="size-5" /></button></div>{recognized && <div className={cn("mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", normalize(recognized) === normalize(task.spelling) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{normalize(recognized) === normalize(task.spelling) ? <Check className="size-3.5" /> : <RotateCcw className="size-3.5" />}识别为：{recognized}</div>}
      {!revealed ? <button onClick={() => setRevealed(true)} className="mx-auto mt-8 flex h-11 items-center gap-2 rounded-xl border border-line px-5 text-sm font-semibold"><BookOpen className="size-4" />查看释义</button> : <div className="mt-8 border-t border-line pt-6 text-left"><p className="text-base font-semibold leading-7">{task.definition}</p>{task.example && <p className="mt-3 text-sm leading-6 text-muted">{task.example}</p>}{task.exampleTranslation && <p className="mt-1 text-xs leading-5 text-muted">{task.exampleTranslation}</p>}</div>}</article>
    <div className="mt-4 grid grid-cols-4 gap-2">{([{ id: "again", label: "忘记", next: "10 分钟" }, { id: "hard", label: "模糊", next: "明天" }, { id: "good", label: "记得", next: "下一阶" }, { id: "easy", label: "熟练", next: "跨两阶" }] as const).map((item) => <button key={item.id} disabled={submitting} onClick={() => rate(item.id)} className={cn("h-16 rounded-xl border border-line bg-card text-xs font-bold transition disabled:opacity-50", item.id === "good" && "border-brand bg-brand text-white")}><span className="block">{item.label}</span><span className={cn("mt-1 block text-[10px] font-normal text-muted", item.id === "good" && "text-blue-100")}>{item.next}</span></button>)}</div>
  </div>;
}

type SpeechRecognitionLike = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: (event: { results: { 0: { 0: { transcript: string } } } }) => void; onerror: () => void; start: () => void };
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");
function Stat({ value, label }: { value: number; label: string }) { return <div><strong className="text-lg">{value}</strong><span className="mt-1 block text-[11px] text-muted">{label}</span></div>; }
function WeekStrip({ activeDays }: { activeDays: TodayData["activeDays"] }) { const days = ["一", "二", "三", "四", "五", "六", "日"]; const current = (new Date().getDay() || 7) - 1; const active = new Set(activeDays.map((day) => day.date)); const monday = new Date(); monday.setDate(monday.getDate() - current); return <div className="mt-5 grid grid-cols-7 rounded-2xl border border-line bg-card px-3 py-4">{days.map((day, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date); const done = active.has(key); return <div key={day} className="text-center"><span className="text-[10px] text-muted">{day}</span><span className={cn("mx-auto mt-2 grid size-7 place-items-center rounded-full text-xs font-semibold", done && "bg-emerald-500 text-white", index === current && !done && "border-2 border-brand text-brand")}>{done ? <Check className="size-3.5" /> : date.getDate()}</span></div>; })}</div>; }
function LoadingState() { return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-7 animate-spin text-brand" /></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="grid min-h-[60vh] place-items-center text-center"><div><p className="font-bold">暂时无法加载任务</p><button onClick={onRetry} className="mt-4 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white">重新加载</button></div></div>; }
function CompleteState({ count, onDone }: { count: number; onDone: () => void }) { return <div className="grid min-h-[70vh] place-items-center text-center"><div><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CalendarCheck2 className="size-9" /></div><h1 className="mt-6 text-2xl font-bold">今天的任务完成了</h1><p className="mt-2 text-sm text-muted">完成 {count} 个词的跟读与回忆，明天继续。</p><button onClick={onDone} className="mt-8 h-11 rounded-xl bg-brand px-8 text-sm font-bold text-white">返回首页</button></div></div>; }
