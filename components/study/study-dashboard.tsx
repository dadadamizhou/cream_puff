"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarCheck2,
  Check,
  ChevronRight,
  Eraser,
  Flame,
  Headphones,
  Keyboard,
  Library,
  LoaderCircle,
  Mic2,
  PencilLine,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWordAudio } from "@/hooks/use-word-audio";
import { useStudyStore } from "@/store/study";
import {
  chunkStudyTasks,
  getRecallDirection,
  isSpellingCorrect,
  partitionStudyTasks,
} from "@/lib/study-session";
import type { StudyTask, TodayData } from "@/types/study";
import type { PracticeTodayData } from "@/types/practice";
import { getWordBook } from "@/lib/word-books";

const todayFetcher = (url: string) => api.get<TodayData>(url).then((response) => response.data);
const practiceFetcher = (url: string) => api.get<PracticeTodayData>(url).then((response) => response.data);

type SessionMode = "all" | "review" | "new";
type SessionSource = "today" | "daily-review" | "daily-new" | "optional-review" | "advance";
type SessionState = { tasks: StudyTask[]; mode: SessionMode; source: SessionSource };
type OptionalStudyMode = "review" | "advance";
type OptionalStudyResponse = { tasks: StudyTask[]; mode: OptionalStudyMode; targetDate: string | null; message: string | null };
type Rating = "again" | "hard" | "good" | "easy";

export function StudyDashboard() {
  const { data, error, isLoading, mutate } = useSWR("/api/study/today", todayFetcher, { revalidateOnFocus: false });
  const { data: practiceData, error: practiceError } = useSWR("/api/practice/today", practiceFetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [session, setSession] = useState<SessionState | null>(null);
  const [optionalLoading, setOptionalLoading] = useState<OptionalStudyMode | null>(null);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={() => mutate()} />;
  if (session) {
    return <StudySession tasks={session.tasks} mode={session.mode} source={session.source} onClose={() => { setSession(null); mutate(); }} onComplete={() => { setSession(null); mutate(); }} />;
  }

  const todayTasks = data.tasks;
  const { reviews, newWords } = partitionStudyTasks(todayTasks);
  const newBatches = Math.ceil(newWords.length / 5);
  const currentBook = data.plan.currentWordBook ? getWordBook(data.plan.currentWordBook) : null;
  const progress = Math.min(100, Math.round((data.week.learned / Math.max(1, data.week.goal)) * 100));
  const practiceStatus = (practiceError as { response?: { status?: number } } | undefined)?.response?.status;
  const practiceLocked = practiceStatus === 409;

  function start(mode: SessionMode) {
    if (!reviews.length && !newWords.length) return;
    const tasks = mode === "review" ? reviews : mode === "new" ? newWords : todayTasks;
    if (!tasks.length) return;
    useStudyStore.getState().reset();
    useStudyStore.getState().startTask();
    const coversAllTasks = (mode === "review" && !newWords.length) || (mode === "new" && !reviews.length);
    setSession({
      tasks,
      mode: coversAllTasks ? "all" : mode,
      source: mode === "all" || coversAllTasks ? "today" : mode === "review" ? "daily-review" : "daily-new",
    });
  }

  async function startOptional(mode: OptionalStudyMode) {
    if (optionalLoading) return;
    setOptionalLoading(mode);
    const toastId = toast.loading(mode === "review" ? "正在挑选适合复习的单词…" : "正在准备明天的新词…");
    try {
      const response = await api.post<OptionalStudyResponse>("/api/study/optional", { mode });
      const result = response.data;
      if (!result.tasks.length) {
        toast.info(result.message || (mode === "review" ? "现在没有适合自由复习的单词" : "明天的新词还没有安排好"), { id: toastId });
        return;
      }
      useStudyStore.getState().reset();
      useStudyStore.getState().startTask();
      toast.success(result.message || (result.mode === "review" ? `已选出 ${result.tasks.length} 个复习词` : `已准备 ${result.tasks.length} 个明天的新词`), { id: toastId });
      setSession({
        tasks: result.tasks,
        mode: result.mode === "review" ? "review" : "new",
        source: result.mode === "review" ? "optional-review" : "advance",
      });
    } catch (optionalError) {
      const serverMessage = (optionalError as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(serverMessage || (mode === "review" ? "自由复习加载失败，请稍后重试" : "明天的任务加载失败，请稍后重试"), { id: toastId });
    } finally {
      setOptionalLoading(null);
    }
  }

  return <div className="pb-5">
    <header className="mb-6 flex items-end justify-between">
      <div><p className="text-sm text-muted">按记忆节奏完成，不用硬撑</p><h1 className="mt-1 text-2xl font-bold">今日学习</h1></div>
      <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><Flame className="size-4 fill-current" />{data.streak} 天</div>
    </header>

    <section className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="bg-brand px-5 py-5 text-white">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white/80">今日记忆课{currentBook ? ` · ${currentBook.label}` : ""}</span><Sparkles className="size-5 text-white/80" /></div>
        <button type="button" disabled={!data.tasks.length} onClick={() => start("all")} aria-label={data.tasks.length ? `开始今天全部 ${data.tasks.length} 个单词` : "今天的学习任务已完成"} className="group mt-3 flex min-h-14 w-full items-end justify-between gap-4 rounded-lg px-2 py-1 text-left transition hover:bg-white/10 active:scale-[0.99] disabled:cursor-default disabled:hover:bg-transparent disabled:active:scale-100">
          <span><strong className="text-3xl">{data.tasks.length}</strong><span className="ml-2 text-sm text-white/80">个待完成</span></span>
          <span className="flex items-center gap-1 text-xs text-white/75">约 {Math.max(3, Math.ceil(reviews.length * 0.5 + newWords.length * 1.2))} 分钟{data.tasks.length ? <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" /> : <Check className="size-4" />}</span>
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <TaskSummaryButton label="新学" count={newWords.length} mode="new" onStart={start} />
          <TaskSummaryButton label="到期复习" count={reviews.length} mode="review" onStart={start} />
        </div>
        <Link href={`/words?scope=day&date=${data.date}`} className="mt-2 flex min-h-10 items-center justify-between rounded-lg px-2 text-xs text-white/80 transition hover:bg-white/10 active:scale-[0.99]"><span>今天已完成 {data.checkin.completedCount} 个</span><span className="flex items-center gap-0.5">查看记录<ChevronRight className="size-3.5" /></span></Link>
        <button disabled={!data.tasks.length} onClick={() => start("all")} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white font-bold text-brand transition active:scale-[0.99] disabled:opacity-70">
          {data.tasks.length ? <><Play className="size-4 fill-current" />开始完整流程</> : <><Check className="size-4" />今日任务已完成</>}
        </button>
      </div>

      <LearningRoute reviewCount={reviews.length} newCount={newWords.length} batchCount={newBatches} practiceCount={practiceData?.summary.remaining ?? null} currentBookLabel={currentBook?.label} />

    </section>

    <WeekStrip activeDays={data.activeDays} weekStart={data.weekStart} today={data.date} />

    <OptionalStudyActions todayComplete={!data.tasks.length} loading={optionalLoading} onStart={startOptional} />

    <Link href="/practice" className="mt-5 flex items-center gap-4 border-y border-line py-4 transition active:opacity-70">
      <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><Brain className="size-5" /></div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-bold">全量混合巩固</p>{practiceData?.summary.completed && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">已完成</span>}</div><p className="mt-1 text-xs text-muted">{practiceLocked ? "完成主流程后解锁" : "从全部已学词中混合听音、辨义与默写"}</p></div>
      <div className="text-right">{practiceLocked ? <span className="text-xs text-muted">未解锁</span> : <><strong className="text-sm text-emerald-700">{practiceData?.summary.remaining ?? "--"}</strong><span className="block text-[10px] text-muted">题</span></>}</div>
    </Link>

    <section className="mt-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand">本周新词</p><h2 className="mt-1 font-bold">目标 {data.plan.weeklyGoal} 个 · 每天约 {data.plan.dailyAverage} 个</h2></div><Link href="/words" aria-label="查看词库" title="查看词库" className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Library className="size-4" /></Link></div>
      <div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div><span className="text-sm font-bold text-brand">{progress}%</span></div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-line text-center"><StatLink href="/words?status=learned&scope=week" value={data.week.learned} label="本周已学" /><StatLink href="/words?status=scheduled&scope=week" value={data.week.scheduled} label="已安排" /><StatLink href="/words?status=unlearned&scope=all" value={data.overall.remaining} label="全书待学" /></div>
    </section>
  </div>;
}

function LearningRoute({ reviewCount, newCount, batchCount, practiceCount, currentBookLabel }: { reviewCount: number; newCount: number; batchCount: number; practiceCount: number | null; currentBookLabel?: string }) {
  const steps = [
    { icon: RotateCcw, title: "到期唤醒", detail: reviewCount ? `${reviewCount} 个旧词 · 先回忆再看答案` : "今天没有到期旧词", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
    { icon: Headphones, title: "新词建联", detail: newCount ? `${currentBookLabel ? `${currentBookLabel} · ` : ""}${newCount} 个随机新词` : "今天的新词已经学完", tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
    { icon: Keyboard, title: "分批回测", detail: newCount ? `${batchCount} 组 · 每 5 词立即默写` : "随新词学习自动完成", tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
    { icon: Brain, title: "全量巩固", detail: practiceCount === null ? "按已学词量动态安排" : `${practiceCount} 题 · 全部已学词混合练习`, tone: "bg-brand-soft text-brand" },
  ];
  return <ol className="px-5 py-2">{steps.map((step, index) => <li key={step.title} className="relative flex gap-3 py-3.5">{index < steps.length - 1 && <span className="absolute bottom-[-0.875rem] left-4 top-11 w-px bg-line" />}<span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full", step.tone)}><step.icon className="size-4" /></span><div className="min-w-0"><p className="text-sm font-bold">{step.title}</p><p className="mt-1 text-xs text-muted">{step.detail}</p></div></li>)}</ol>;
}

function TaskSummaryButton({ label, count, mode, onStart }: { label: string; count: number; mode: Exclude<SessionMode, "all">; onStart: (mode: SessionMode) => void }) {
  return <button type="button" disabled={!count} onClick={() => onStart(mode)} aria-label={count ? `开始${label} ${count} 个单词` : `${label}任务为空`} className="group flex min-h-16 items-center justify-between rounded-lg bg-white/15 px-3 py-2.5 text-left transition hover:bg-white/25 active:scale-[0.98] disabled:cursor-default disabled:bg-white/[0.08] disabled:text-white/50 disabled:active:scale-100"><span><span className="block text-[11px] text-white/75 group-disabled:text-white/45">{label}</span><strong className="mt-0.5 block text-lg">{count}</strong></span>{count ? <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" /> : <Check className="size-4 opacity-55" />}</button>;
}

function OptionalStudyActions({ todayComplete, loading, onStart }: { todayComplete: boolean; loading: OptionalStudyMode | null; onStart: (mode: OptionalStudyMode) => void }) {
  if (todayComplete) {
    return <section className="mt-5 rounded-lg border border-brand/25 bg-brand-soft p-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-brand"><Sparkles className="size-5" /></span><div><p className="text-sm font-bold">今天完成得很扎实</p><p className="mt-1 text-xs text-muted">状态不错，可以提前认识明天的新词</p></div></div><button type="button" disabled={loading !== null} onClick={() => onStart("advance")} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-60">{loading === "advance" ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}提前学明天</button><button type="button" disabled={loading !== null} onClick={() => onStart("review")} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-card text-sm font-semibold text-foreground transition active:scale-[0.99] disabled:opacity-60">{loading === "review" ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4 text-brand" />}自由复习旧词</button></section>;
  }

  return <button type="button" disabled={loading !== null} onClick={() => onStart("review")} className="mt-5 flex min-h-16 w-full items-center gap-3 border-y border-line py-3 text-left transition hover:bg-brand-soft/40 active:opacity-70 disabled:opacity-60"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{loading === "review" ? <LoaderCircle className="size-5 animate-spin" /> : <RotateCcw className="size-5" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">自由复习</span><span className="mt-1 block text-xs text-muted">优先抽取最久未复习的一组已学词</span></span><ChevronRight className="size-4 shrink-0 text-muted" /></button>;
}

function StudySession({ tasks, mode, source, onClose, onComplete }: { tasks: StudyTask[]; mode: SessionMode; source: SessionSource; onClose: () => void; onComplete: () => void }) {
  const planned = useMemo(() => {
    const partitioned = partitionStudyTasks(tasks);
    return {
      reviews: mode === "new" ? [] : partitioned.reviews,
      newWords: mode === "review" ? [] : partitioned.newWords,
    };
  }, [mode, tasks]);
  const batches = useMemo(() => chunkStudyTasks(planned.newWords), [planned.newWords]);
  const [phase, setPhase] = useState<"review" | "learn" | "recall" | "complete">(planned.reviews.length ? "review" : batches.length ? "learn" : "complete");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [batchIndex, setBatchIndex] = useState(0);
  const [learnIndex, setLearnIndex] = useState(0);
  const [recallIndex, setRecallIndex] = useState(0);
  const [doneSteps, setDoneSteps] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { getElapsedMs, startTask } = useStudyStore();
  const totalSteps = planned.reviews.length + planned.newWords.length * 2;
  const currentBatch = batches[batchIndex] ?? [];

  async function record(task: StudyTask, rating: Rating, pronunciationMatched?: boolean) {
    setSubmitting(true);
    try {
      const reviewSource = source === "optional-review" ? "optional-review" : source === "advance" ? "advance" : "today";
      await api.post("/api/study/review", { userWordId: task.id, rating, pronunciationMatched, durationMs: getElapsedMs(), source: reviewSource });
      startTask();
      return true;
    } catch {
      toast.error("记录失败，请检查网络后重试");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function finishReview(task: StudyTask, rating: Rating, pronunciationMatched?: boolean) {
    if (!await record(task, rating, pronunciationMatched)) return;
    setDoneSteps((value) => value + 1);
    if (reviewIndex + 1 < planned.reviews.length) setReviewIndex((value) => value + 1);
    else if (batches.length) { setPhase("learn"); setLearnIndex(0); }
    else setPhase("complete");
  }

  function finishLearningCard() {
    setDoneSteps((value) => value + 1);
    if (learnIndex + 1 < currentBatch.length) setLearnIndex((value) => value + 1);
    else { setPhase("recall"); setRecallIndex(0); }
    startTask();
  }

  async function finishRecall(task: StudyTask, rating: Rating) {
    if (!await record(task, rating)) return;
    setDoneSteps((value) => value + 1);
    if (recallIndex + 1 < currentBatch.length) setRecallIndex((value) => value + 1);
    else if (batchIndex + 1 < batches.length) { setBatchIndex((value) => value + 1); setLearnIndex(0); setRecallIndex(0); setPhase("learn"); }
    else setPhase("complete");
  }

  if (phase === "complete") return <CompleteState source={source} reviewCount={planned.reviews.length} newCount={planned.newWords.length} onDone={onComplete} />;

  const phaseLabel = phase === "review" ? "到期唤醒" : phase === "learn" ? `新词建联 · 第 ${batchIndex + 1}/${batches.length} 组` : `当批回测 · 第 ${batchIndex + 1}/${batches.length} 组`;
  const percent = Math.round((doneSteps / Math.max(1, totalSteps)) * 100);

  return <div className="mx-auto max-w-xl pb-5">
    <header className="mb-5 flex items-center gap-3"><button onClick={onClose} aria-label="退出学习" title="退出学习" className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-card text-muted"><X className="size-5" /></button><div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold text-foreground">{phaseLabel}</span><span className="text-muted">{doneSteps}/{totalSteps}</span></div><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} /></div></div></header>
    {phase === "review" && <AdaptiveReviewCard key={planned.reviews[reviewIndex].id} task={planned.reviews[reviewIndex]} position={reviewIndex + 1} total={planned.reviews.length} submitting={submitting} onRate={finishReview} />}
    {phase === "learn" && <NewWordCard key={currentBatch[learnIndex].id} task={currentBatch[learnIndex]} position={learnIndex + 1} total={currentBatch.length} onNext={finishLearningCard} />}
    {phase === "recall" && <BatchRecallCard key={currentBatch[recallIndex].id} task={currentBatch[recallIndex]} position={recallIndex + 1} total={currentBatch.length} submitting={submitting} onFinish={finishRecall} />}
  </div>;
}

function AdaptiveReviewCard({ task, position, total, submitting, onRate }: { task: StudyTask; position: number; total: number; submitting: boolean; onRate: (task: StudyTask, rating: Rating, pronunciationMatched?: boolean) => Promise<void> }) {
  const direction = getRecallDirection(task);
  const audio = useWordAudio(task.spelling, { autoPlay: direction === "meaning" });
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [recognized, setRecognized] = useState<string | null>(null);

  function checkSpelling() {
    if (!answer.trim()) return;
    setCorrect(isSpellingCorrect(answer, task.spelling));
    setRevealed(true);
  }

  return <section>
    <div className="mb-3 flex items-center justify-between text-xs text-muted"><span>{getWordBook(task.wordBook).shortLabel} · {direction === "spelling" ? "输出拼写" : "识义回忆"}</span><span>{position}/{total}</span></div>
    <article className="rounded-lg border border-line bg-card p-5 text-center shadow-sm sm:p-6">
      {direction === "meaning" ? <>
        <p className="text-xs font-semibold text-emerald-700">先回忆，再核对</p>
        <h1 className="mt-7 break-all text-[clamp(2.25rem,12vw,4rem)] font-bold">{task.spelling}</h1>
        <p className="mt-2 min-h-6 text-sm text-muted">{task.phonetic}</p>
        <div className="mt-5 flex justify-center gap-3"><AudioButton audio={audio} /><SpeakButton spelling={task.spelling} onRecognized={setRecognized} /></div>
        {recognized && <SpeechResult recognized={recognized} spelling={task.spelling} />}
      </> : <>
        <p className="text-xs font-semibold text-emerald-700">看释义，写出英文</p>
        <h1 className="mx-auto mt-7 max-w-md text-xl font-bold leading-8">{task.definition}</h1>
        <label className="mt-7 block"><span className="sr-only">输入英文单词</span><input autoFocus autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={revealed} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") checkSpelling(); }} placeholder="输入英文单词" className={cn("h-14 w-full rounded-lg border bg-background px-4 text-center text-lg font-bold outline-none transition focus:border-brand focus:ring-4 focus:ring-pink-100", correct === true && "border-emerald-400 bg-emerald-50", correct === false && "border-rose-300 bg-rose-50")} /></label>
      </>}

      {revealed && <div className="mt-6 border-t border-line pt-5 text-left"><div className="flex items-start justify-between gap-3"><div><p className="text-2xl font-bold">{task.spelling}</p><p className="mt-1 text-xs text-muted">{task.phonetic}</p></div>{direction === "spelling" && <AudioButton audio={audio} compact />}</div><p className="mt-4 text-sm font-semibold leading-6">{task.definition}</p>{task.example && <p className="mt-3 text-sm leading-6 text-muted">{task.example}</p>}{task.exampleTranslation && <p className="mt-1 text-xs leading-5 text-muted">{task.exampleTranslation}</p>}</div>}
    </article>

    {!revealed ? <button type="button" onClick={() => direction === "meaning" ? setRevealed(true) : checkSpelling()} disabled={direction === "spelling" && !answer.trim()} className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white disabled:opacity-50"><BookOpen className="size-4" />{direction === "meaning" ? "核对词义" : "检查答案"}</button> : direction === "spelling" && correct ? <button type="button" disabled={submitting} onClick={() => onRate(task, "good", recognized ? isSpellingCorrect(recognized, task.spelling) : undefined)} className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-bold text-white disabled:opacity-60"><Check className="size-4" />答对，继续</button> : <RatingButtons submitting={submitting} onRate={(rating) => onRate(task, rating, recognized ? isSpellingCorrect(recognized, task.spelling) : undefined)} />}
  </section>;
}

function RatingButtons({ submitting, onRate }: { submitting: boolean; onRate: (rating: Rating) => void }) {
  const ratings = [
    { id: "again", label: "完全忘了", detail: "10 分钟后重现", style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300" },
    { id: "hard", label: "有点模糊", detail: "明天加强", style: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300" },
    { id: "good", label: "成功想起", detail: "正常间隔", style: "border-brand bg-brand text-white" },
    { id: "easy", label: "非常熟悉", detail: "延长间隔", style: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300" },
  ] as const;
  return <div className="mt-4 grid grid-cols-2 gap-2.5">{ratings.map((item) => <button key={item.id} type="button" disabled={submitting} onClick={() => onRate(item.id)} className={cn("flex h-[66px] flex-col items-center justify-center rounded-lg border px-2 text-sm font-bold disabled:opacity-60", item.style)}>{item.label}<span className="mt-1 text-[10px] font-normal opacity-75">{item.detail}</span></button>)}</div>;
}

function NewWordCard({ task, position, total, onNext }: { task: StudyTask; position: number; total: number; onNext: () => void }) {
  const audio = useWordAudio(task.spelling);
  const [recognized, setRecognized] = useState<string | null>(null);
  const [showWriting, setShowWriting] = useState(false);

  return <section>
    <div className="mb-3 flex items-center justify-between text-xs text-muted"><span>{getWordBook(task.wordBook).label} · 认识新词</span><span>{position}/{total}</span></div>
    <article className="rounded-lg border border-line bg-card p-5 shadow-sm sm:p-6">
      <div className="text-center"><p className="text-xs font-semibold text-blue-700">听音、理解、建立拼写印象</p><h1 className="mt-5 break-all text-[clamp(2.25rem,12vw,4rem)] font-bold">{task.spelling}</h1><p className="mt-2 text-sm text-muted">{task.phonetic}</p><div className="mt-5 flex justify-center gap-3"><AudioButton audio={audio} /><SpeakButton spelling={task.spelling} onRecognized={setRecognized} /></div>{recognized && <SpeechResult recognized={recognized} spelling={task.spelling} />}</div>
      <div className="mt-6 border-t border-line pt-5"><p className="text-base font-bold leading-7">{task.definition}</p>{task.example && <p className="mt-3 text-sm leading-6">{task.example}</p>}{task.exampleTranslation && <p className="mt-1 text-xs leading-5 text-muted">{task.exampleTranslation}</p>}{task.memoryTip && <div className="mt-4 border-l-2 border-amber-400 pl-3"><p className="text-xs font-semibold text-amber-800 dark:text-amber-300">记忆线索</p><p className="mt-1 text-xs leading-5 text-muted">{task.memoryTip}</p></div>}</div>
      <button type="button" onClick={() => setShowWriting((value) => !value)} className={cn("mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-bold", showWriting ? "border-brand bg-brand-soft text-brand" : "border-line bg-background text-foreground")}><PencilLine className="size-4" />{showWriting ? "收起手写" : "手写一遍"}</button>
      {showWriting && <HandwritingPad guide={task.spelling} />}
    </article>
    <button type="button" onClick={onNext} className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white">记住了，下一个<ArrowRight className="size-4" /></button>
  </section>;
}

function BatchRecallCard({ task, position, total, submitting, onFinish }: { task: StudyTask; position: number; total: number; submitting: boolean; onFinish: (task: StudyTask, rating: Rating) => Promise<void> }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const audio = useWordAudio(task.spelling, { autoPlay: false });

  function check() {
    if (!answer.trim()) return;
    const isCorrect = isSpellingCorrect(answer, task.spelling);
    setResult(isCorrect ? "correct" : "wrong");
    if (!isCorrect) setMistakes((value) => value + 1);
  }

  function retry() {
    setAnswer("");
    setResult(null);
  }

  return <section>
    <div className="mb-3 flex items-center justify-between text-xs text-muted"><span>{getWordBook(task.wordBook).shortLabel} · 遮住答案主动写出</span><span>{position}/{total}</span></div>
    <article className="rounded-lg border border-line bg-card p-5 text-center shadow-sm sm:p-6">
      <p className="text-xs font-semibold text-amber-700">当批默写</p><h1 className="mx-auto mt-7 max-w-md text-xl font-bold leading-8">{task.definition}</h1>
      <label className="mt-7 block"><span className="sr-only">输入英文单词</span><input autoFocus autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={result !== null} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") check(); }} placeholder="输入英文单词" className={cn("h-14 w-full rounded-lg border bg-background px-4 text-center text-lg font-bold outline-none transition focus:border-brand focus:ring-4 focus:ring-pink-100", result === "correct" && "border-emerald-400 bg-emerald-50", result === "wrong" && "border-rose-300 bg-rose-50")} /></label>
      {result && <div className={cn("mt-5 rounded-lg px-4 py-4 text-left", result === "correct" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300")}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">{result === "correct" ? "拼写正确" : "正确拼写"}</p><p className="mt-1 text-2xl font-bold">{task.spelling}</p></div><AudioButton audio={audio} compact /></div>{result === "wrong" && task.memoryTip && <p className="mt-3 text-xs leading-5 opacity-80">{task.memoryTip}</p>}</div>}
    </article>
    {!result && <button type="button" onClick={check} disabled={!answer.trim()} className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white disabled:opacity-50"><Check className="size-4" />检查答案</button>}
    {result === "correct" && <button type="button" disabled={submitting} onClick={() => onFinish(task, mistakes ? "hard" : "good")} className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-bold text-white disabled:opacity-60"><ArrowRight className="size-4" />继续</button>}
    {result === "wrong" && <div className="mt-4 grid grid-cols-[1fr_auto] gap-2.5"><button type="button" onClick={retry} className="flex h-13 items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white"><RotateCcw className="size-4" />遮住，再写一次</button>{mistakes >= 2 && <button type="button" disabled={submitting} onClick={() => onFinish(task, "again")} className="h-13 rounded-lg border border-line bg-card px-4 text-xs font-semibold text-muted disabled:opacity-60">暂时跳过</button>}</div>}
  </section>;
}

function HandwritingPad({ guide }: { guide: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const context = canvas.getContext("2d");
      if (context) { context.scale(ratio, ratio); context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--foreground"); context.lineWidth = 3; }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    context?.beginPath();
    context?.moveTo(current.x, current.y);
  }
  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const current = point(event);
    const context = event.currentTarget.getContext("2d");
    context?.lineTo(current.x, current.y);
    context?.stroke();
  }

  return <div className="mt-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-muted">沿浅色字手写一遍</p><button type="button" onClick={clear} aria-label="清空手写板" title="清空手写板" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-background"><Eraser className="size-4" /></button></div><div className="relative h-36 overflow-hidden rounded-lg border border-dashed border-line bg-background"><span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center break-all px-3 text-center text-[clamp(2rem,11vw,3.5rem)] font-bold text-line">{guide}</span><span aria-hidden className="pointer-events-none absolute inset-x-4 bottom-8 border-b border-line" /><canvas ref={canvasRef} onPointerDown={start} onPointerMove={draw} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} className="relative h-full w-full touch-none" /></div></div>;
}

function AudioButton({ audio, compact = false }: { audio: ReturnType<typeof useWordAudio>; compact?: boolean }) {
  return <button type="button" onClick={audio.play} aria-label="播放单词发音" aria-busy={audio.isLoading} title="播放单词发音" className={cn("grid place-items-center rounded-full bg-brand text-white transition active:scale-95", compact ? "size-10" : "size-12", audio.isPlaying && "ring-4 ring-brand-soft")}>{audio.isLoading ? <LoaderCircle className="size-5 animate-spin" /> : <Volume2 className={cn("size-5", audio.isPlaying && "animate-pulse")} />}</button>;
}

function SpeakButton({ spelling, onRecognized }: { spelling: string; onRecognized: (value: string) => void }) {
  function listen() {
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.info("当前浏览器不支持语音识别，可以跟读后继续"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => onRecognized(event.results[0][0].transcript);
    recognition.onerror = () => toast.error("没有听清，再试一次吧");
    recognition.start();
  }
  return <button type="button" onClick={listen} aria-label={`跟读 ${spelling}`} title="开始跟读识别" className="grid size-12 place-items-center rounded-full border border-line bg-card text-foreground transition active:scale-95"><Mic2 className="size-5" /></button>;
}

function SpeechResult({ recognized, spelling }: { recognized: string; spelling: string }) {
  const matched = isSpellingCorrect(recognized, spelling);
  return <div className={cn("mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", matched ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{matched ? <Check className="size-3.5" /> : <RotateCcw className="size-3.5" />}识别为：{recognized}</div>;
}

type SpeechRecognitionLike = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: (event: { results: { 0: { 0: { transcript: string } } } }) => void; onerror: () => void; start: () => void };

function StatLink({ href, value, label }: { href: string; value: number; label: string }) { return <Link href={href} className="group mx-1 flex min-h-14 flex-col items-center justify-center rounded-lg transition hover:bg-brand-soft active:scale-95"><strong className="text-lg transition group-hover:text-brand">{value}</strong><span className="mt-1 flex items-center gap-0.5 text-[11px] text-muted group-hover:text-brand">{label}<ChevronRight className="size-3" /></span></Link>; }
function WeekStrip({ activeDays, weekStart, today }: { activeDays: TodayData["activeDays"]; weekStart: string; today: string }) { const days = ["一", "二", "三", "四", "五", "六", "日"]; const active = new Set(activeDays.filter((day) => day.fullyCompleted).map((day) => day.date)); const [year, month, dayOfMonth] = weekStart.split("-").map(Number); return <nav aria-label="本周学习记录" className="mt-5 grid grid-cols-7 gap-0.5 border-y border-line py-2">{days.map((day, index) => { const date = new Date(Date.UTC(year, month - 1, dayOfMonth + index)); const key = date.toISOString().slice(0, 10); const done = active.has(key); const current = key === today; return <Link key={key} href={`/words?scope=day&date=${key}`} aria-label={`${key}，${current ? "今天，" : ""}${done ? "已完成，" : ""}查看当天学习记录`} aria-current={current ? "date" : undefined} className="group flex min-h-14 flex-col items-center justify-center rounded-lg text-center transition hover:bg-brand-soft active:scale-95"><span className="text-[10px] text-muted transition group-hover:text-brand">{day}</span><span className={cn("mt-1.5 grid size-7 place-items-center rounded-full text-xs font-semibold transition", done && "bg-emerald-500 text-white", current && !done && "border-2 border-brand text-brand", !done && !current && "group-hover:bg-card group-hover:text-brand")}>{done ? <Check className="size-3.5" /> : date.getUTCDate()}</span></Link>; })}</nav>; }
function LoadingState() { return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-7 animate-spin text-brand" /></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="grid min-h-[60vh] place-items-center text-center"><div><p className="font-bold">暂时无法加载任务</p><button onClick={onRetry} className="mt-4 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white">重新加载</button></div></div>; }
function CompleteState({ source, reviewCount, newCount, onDone }: { source: SessionSource; reviewCount: number; newCount: number; onDone: () => void }) { const wholeFlow = source === "today"; const copy: Record<SessionSource, { eyebrow: string; title: string; action: string }> = { today: { eyebrow: "主流程完成", title: "今天的记忆已经加固", action: "返回今日学习" }, "daily-review": { eyebrow: "到期复习完成", title: "这组旧词已经唤醒", action: "继续今日任务" }, "daily-new": { eyebrow: "新词学习完成", title: "这组新词已经学会", action: "继续今日任务" }, "optional-review": { eyebrow: "自由复习完成", title: "这组记忆已经重新加固", action: "返回今日学习" }, advance: { eyebrow: "提前学习完成", title: "明天的新词已经认识", action: "返回今日学习" } }; const current = copy[source]; return <div className="grid min-h-[70vh] place-items-center text-center"><div className="w-full max-w-sm"><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CalendarCheck2 className="size-9" /></div><p className="mt-6 text-sm text-muted">{current.eyebrow}</p><h1 className="mt-1 text-2xl font-bold">{current.title}</h1><div className="mt-6 grid grid-cols-2 divide-x divide-line border-y border-line py-4"><div><strong className="text-xl">{reviewCount}</strong><span className="mt-1 block text-xs text-muted">复习加固</span></div><div><strong className="text-xl">{newCount}</strong><span className="mt-1 block text-xs text-muted">新词学会</span></div></div>{wholeFlow && <Link href="/practice" className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-bold text-white"><Brain className="size-4" />开始全量混合巩固</Link>}<button onClick={onDone} className={cn("h-11 w-full text-sm font-semibold", wholeFlow ? "mt-3 text-muted" : "mt-6 rounded-lg bg-brand text-white")}>{current.action}</button></div></div>; }
