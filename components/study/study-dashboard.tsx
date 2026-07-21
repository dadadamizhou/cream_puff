"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BookOpen, CalendarCheck2, Cat, Check, ChevronRight, Flame, LoaderCircle, LockKeyhole, Mic2, PawPrint, Play, RotateCcw, Sparkles, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWordAudio } from "@/hooks/use-word-audio";
import { useStudyStore } from "@/store/study";
import type { StudyTask, TodayData } from "@/types/study";
import type { PracticeTodayData } from "@/types/practice";

const todayFetcher = (url: string) => api.get<TodayData>(url).then((response) => response.data);
const practiceFetcher = (url: string) => api.get<PracticeTodayData>(url).then((response) => response.data);

export function StudyDashboard() {
  const { data, error, isLoading, mutate } = useSWR("/api/study/today", todayFetcher, { revalidateOnFocus: false });
  const { data: practiceData, error: practiceError } = useSWR("/api/practice/today", practiceFetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [session, setSession] = useState<StudyTask[] | null>(null);
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={() => mutate()} />;
  if (session) return <StudySession tasks={session} onClose={() => { setSession(null); mutate(); }} onComplete={() => { setSession(null); mutate(); }} />;

  const totalDone = data.checkin.completedCount;
  const progress = Math.min(100, Math.round((data.week.learned / Math.max(1, data.week.goal)) * 100));
  const newCount = data.tasks.filter((task) => task.reviewCount === 0).length;
  const reviewCount = data.tasks.length - newCount;
  const practiceStatus = (practiceError as { response?: { status?: number } } | undefined)?.response?.status;
  const practiceLocked = practiceStatus === 409;
  return <div className="pb-4"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm text-muted">今天也别忘了开口</p><h1 className="mt-1 text-2xl font-bold tracking-tight">今日学习</h1></div><div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><Flame className="size-4 fill-current" />{data.streak} 天</div></div>
    <section className="relative overflow-hidden rounded-2xl bg-brand p-5 text-white shadow-lg shadow-pink-200/70 dark:shadow-none"><div className="absolute -right-8 -top-12 size-32 rounded-full border-[24px] border-white/10" /><div className="relative"><div className="mb-6 flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">间隔复习 · 自动安排</span><Sparkles className="size-5 text-white/80" /></div><p className="text-sm text-white/80">今天待完成</p><div className="mt-1 flex items-end gap-2"><strong className="text-4xl tracking-tight">{data.tasks.length}</strong><span className="mb-1 text-sm text-white/80">个词</span></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/12 px-3 py-2.5"><span className="text-[11px] text-white/75">新学</span><strong className="mt-0.5 block text-lg">{newCount}</strong></div><div className="rounded-xl bg-white/12 px-3 py-2.5"><span className="text-[11px] text-white/75">到期复习</span><strong className="mt-0.5 block text-lg">{reviewCount}</strong></div></div><p className="mt-3 text-xs text-white/75">预计 {Math.max(2, Math.ceil(data.tasks.length * 0.45))} 分钟 · 今天已完成 {totalDone} 个</p><button disabled={!data.tasks.length} onClick={() => { useStudyStore.getState().reset(); useStudyStore.getState().startTask(); setSession(data.tasks); }} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-brand transition hover:bg-pink-50 disabled:opacity-70">{data.tasks.length ? <><Play className="size-4 fill-current" />开始今日任务</> : <><Check className="size-4" />今日任务已完成</>}</button></div></section>
    <WeekStrip activeDays={data.activeDays} />
    <Link href="/practice" className="mt-5 flex items-center gap-4 rounded-2xl border border-pink-200 bg-card p-4 shadow-sm transition active:scale-[0.99]"><div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">{practiceLocked ? <LockKeyhole className="size-5" /> : <Cat className="size-6" />}<PawPrint className="absolute -right-1 -top-1 size-4 fill-current" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-bold">每日一练</p>{practiceData?.summary.completed && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">已完成</span>}</div><p className="mt-1 text-xs text-muted">{practiceLocked ? "完成至少一个单词后解锁" : practiceError ? "练习服务暂时不可用，点击查看原因" : "翻译选择 · 听音选择 · 听力默写"}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand" style={{ width: `${practiceData ? Math.round(practiceData.summary.answered / Math.max(1, practiceData.summary.total) * 100) : 0}%` }} /></div></div><div className="text-right">{practiceLocked ? <LockKeyhole className="ml-auto size-4 text-muted" /> : <><strong className="text-sm text-brand">{practiceData?.summary.remaining ?? 15}</strong><span className="block text-[10px] text-muted">题待完成</span></>}</div></Link>
    <section className="mt-5 rounded-2xl border border-line bg-card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-brand">本周新词</p><h2 className="mt-1 font-bold">目标 {data.plan.weeklyGoal} 个 · 每天约 {data.plan.dailyAverage} 个</h2></div><span className="text-sm font-bold text-brand">{progress}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-4 grid grid-cols-3 divide-x divide-line text-center"><Stat value={data.week.learned} label="本周已学" /><Stat value={data.week.scheduled} label="已安排" /><Stat value={Math.max(0, data.week.goal - data.week.learned)} label="目标剩余" /></div></section>
    <section className="mt-5 flex items-center gap-4 rounded-2xl border border-line bg-card p-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><BookOpen className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">记忆小提示</p><p className="mt-1 text-xs leading-5 text-muted">先听音并大声跟读，再看释义。一次主动回忆比反复浏览更有效。</p></div><ChevronRight className="size-4 shrink-0 text-muted" /></section>
  </div>;
}

function StudySession({ tasks, onClose, onComplete }: { tasks: StudyTask[]; onClose: () => void; onComplete: () => void }) {
  const { currentIndex, setCurrentIndex, startTask, getElapsedMs } = useStudyStore();
  const [submittingRating, setSubmittingRating] = useState<"again" | "hard" | "good" | "easy" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [recognized, setRecognized] = useState<string | null>(null);
  const task = tasks[currentIndex];
  if (!task) return <CompleteState count={tasks.length} onDone={onComplete} />;
  return <ActiveStudyCard key={task.id} task={task} currentIndex={currentIndex} total={tasks.length} revealed={revealed} setRevealed={setRevealed} recognized={recognized} setRecognized={setRecognized} submittingRating={submittingRating} setSubmittingRating={setSubmittingRating} onClose={onClose} onAdvance={() => { setRevealed(false); setRecognized(null); startTask(); setCurrentIndex(currentIndex + 1); }} getElapsedMs={getElapsedMs} />;
}

type Rating = "again" | "hard" | "good" | "easy";

function ActiveStudyCard({ task, currentIndex, total, revealed, setRevealed, recognized, setRecognized, submittingRating, setSubmittingRating, onClose, onAdvance, getElapsedMs }: {
  task: StudyTask;
  currentIndex: number;
  total: number;
  revealed: boolean;
  setRevealed: (revealed: boolean) => void;
  recognized: string | null;
  setRecognized: (recognized: string | null) => void;
  submittingRating: Rating | null;
  setSubmittingRating: (rating: Rating | null) => void;
  onClose: () => void;
  onAdvance: () => void;
  getElapsedMs: () => number;
}) {
  const audio = useWordAudio(task.spelling);
  const pct = Math.round((currentIndex / total) * 100);

  function listen() {
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.info("当前浏览器不支持语音识别，可以跟读后直接自评"); return; }
    const recognition = new SpeechRecognition(); recognition.lang = "en-US"; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.onresult = (event) => { const text = event.results[0][0].transcript; setRecognized(text); }; recognition.onerror = () => toast.error("没有听清，再试一次吧"); recognition.start();
  }
  async function rate(rating: Rating) {
    setSubmittingRating(rating);
    try { await api.post("/api/study/review", { userWordId: task.id, rating, pronunciationMatched: recognized ? normalize(recognized) === normalize(task.spelling) : undefined, durationMs: getElapsedMs() }); onAdvance(); }
    catch { toast.error("记录失败，请检查网络后重试"); }
    finally { setSubmittingRating(null); }
  }
  const ratings = [
    { id: "again", label: "完全忘了", next: "稍后再学", style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300" },
    { id: "hard", label: "有点模糊", next: "加强复习", style: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300" },
    { id: "good", label: "成功想起", next: "正常复习", style: "border-brand bg-brand text-white shadow-sm shadow-pink-200/70 dark:shadow-none" },
    { id: "easy", label: "非常熟悉", next: "延长间隔", style: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300" },
  ] as const;

  return <div className="mx-auto max-w-xl"><header className="mb-4 flex items-center gap-3"><button onClick={onClose} aria-label="退出学习" className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-card text-muted transition active:scale-95"><X className="size-5" /></button><div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div><span className="w-12 text-right text-xs font-semibold text-muted">{currentIndex + 1}/{total}</span></header>
    <article className="min-h-[350px] rounded-2xl border border-line bg-card p-5 text-center shadow-sm sm:p-6"><span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand">{task.reviewCount ? `第 ${task.stage + 1} 阶复习` : "本周新词"}</span><h1 className="mt-6 break-all text-[clamp(2.25rem,12vw,4rem)] font-bold tracking-normal">{task.spelling}</h1><p className="mt-2 min-h-6 text-sm text-muted">{task.phonetic || "先听发音，再尝试回忆词义"}</p><div className="mt-5 flex justify-center gap-3"><button type="button" onClick={audio.play} aria-label="播放单词发音" aria-busy={audio.isLoading} title="播放单词发音" className={cn("grid size-12 place-items-center rounded-full bg-brand text-white shadow-lg shadow-pink-200 transition active:scale-95 dark:shadow-none", audio.isPlaying && "ring-4 ring-brand-soft")}>{audio.isLoading ? <LoaderCircle className="size-5 animate-spin" /> : <Volume2 className={cn("size-5", audio.isPlaying && "animate-pulse")} />}</button><button type="button" onClick={listen} aria-label="开始跟读识别" title="开始跟读识别" className="grid size-12 place-items-center rounded-full border border-line bg-card text-foreground transition active:scale-95"><Mic2 className="size-5" /></button></div><p className={cn("mx-auto mt-3 min-h-5 text-xs", audio.status === "error" ? "text-rose-600" : audio.status === "needs-interaction" ? "font-semibold text-brand" : "text-muted")}>{audio.message}</p>{recognized && <div className={cn("mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", normalize(recognized) === normalize(task.spelling) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{normalize(recognized) === normalize(task.spelling) ? <Check className="size-3.5" /> : <RotateCcw className="size-3.5" />}识别为：{recognized}</div>}
      {revealed && <div className="mt-5 border-t border-line pt-5 text-left"><p className="text-base font-semibold leading-7">{task.definition}</p>{task.example && <p className="mt-3 text-sm leading-6 text-muted">{task.example}</p>}{task.exampleTranslation && <p className="mt-1 text-xs leading-5 text-muted">{task.exampleTranslation}</p>}</div>}</article>
    {!revealed ? <div className="mt-4"><p className="text-center text-xs leading-5 text-muted">先在心里说出词义，想好后再核对答案</p><button type="button" onClick={() => setRevealed(true)} className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-white shadow-lg shadow-pink-200/70 transition active:scale-[0.99] dark:shadow-none"><BookOpen className="size-4" />查看答案</button></div> : <div className="mt-4"><p className="text-center text-sm font-bold">刚才回忆得怎么样？</p><p className="mt-1 text-center text-xs text-muted">选择真实感受，泡芙会安排下次复习</p><div className="mt-3 grid grid-cols-2 gap-2.5">{ratings.map((item) => <button key={item.id} type="button" disabled={submittingRating !== null} onClick={() => rate(item.id)} className={cn("flex h-[68px] flex-col items-center justify-center rounded-2xl border px-2 text-sm font-bold transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60", item.style)}><span className="flex items-center gap-1.5">{submittingRating === item.id && <LoaderCircle className="size-3.5 animate-spin" />}{item.label}</span><span className={cn("mt-1 block text-[10px] font-normal opacity-75")}>{item.next}</span></button>)}</div></div>}
  </div>;
}

type SpeechRecognitionLike = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: (event: { results: { 0: { 0: { transcript: string } } } }) => void; onerror: () => void; start: () => void };
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");
function Stat({ value, label }: { value: number; label: string }) { return <div><strong className="text-lg">{value}</strong><span className="mt-1 block text-[11px] text-muted">{label}</span></div>; }
function WeekStrip({ activeDays }: { activeDays: TodayData["activeDays"] }) { const days = ["一", "二", "三", "四", "五", "六", "日"]; const current = (new Date().getDay() || 7) - 1; const active = new Set(activeDays.filter((day) => day.fullyCompleted).map((day) => day.date)); const monday = new Date(); monday.setDate(monday.getDate() - current); return <div className="mt-5 grid grid-cols-7 rounded-2xl border border-line bg-card px-3 py-4">{days.map((day, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date); const done = active.has(key); return <div key={day} className="text-center"><span className="text-[10px] text-muted">{day}</span><span className={cn("mx-auto mt-2 grid size-7 place-items-center rounded-full text-xs font-semibold", done && "bg-emerald-500 text-white", index === current && !done && "border-2 border-brand text-brand")}>{done ? <Check className="size-3.5" /> : date.getDate()}</span></div>; })}</div>; }
function LoadingState() { return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-7 animate-spin text-brand" /></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="grid min-h-[60vh] place-items-center text-center"><div><p className="font-bold">暂时无法加载任务</p><button onClick={onRetry} className="mt-4 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white">重新加载</button></div></div>; }
function CompleteState({ count, onDone }: { count: number; onDone: () => void }) { return <div className="grid min-h-[70vh] place-items-center text-center"><div><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CalendarCheck2 className="size-9" /></div><h1 className="mt-6 text-2xl font-bold">今天的任务完成了</h1><p className="mt-2 text-sm text-muted">完成 {count} 个词的跟读与回忆，明天继续。</p><button onClick={onDone} className="mt-8 h-11 rounded-xl bg-brand px-8 text-sm font-bold text-white">返回首页</button></div></div>; }
