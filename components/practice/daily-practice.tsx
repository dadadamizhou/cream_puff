"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { isAxiosError } from "axios";
import { ArrowRight, Cat, Check, CheckCircle2, Dog, Headphones, Keyboard, LoaderCircle, PawPrint, RotateCcw, Sparkles, Volume2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWordAudio } from "@/hooks/use-word-audio";
import { cn } from "@/lib/utils";
import { usePracticeStore } from "@/store/practice";
import type { PracticeAnswerData, PracticeApiError, PracticeQuestion, PracticeTodayData, PracticeType } from "@/types/practice";

const fetcher = (url: string) => api.get<PracticeTodayData>(url).then((response) => response.data);

const TYPE_META: Record<PracticeType, { label: string; short: string; icon: typeof PawPrint }> = {
  meaning_to_word: { label: "看中文，选单词", short: "中选英", icon: PawPrint },
  word_to_meaning: { label: "看单词，选释义", short: "英选中", icon: Cat },
  listening_choice: { label: "听发音，选释义", short: "听音选择", icon: Headphones },
  listening_dictation: { label: "听发音，默写单词", short: "听力默写", icon: Volume2 },
  translation_dictation: { label: "看中文，默写单词", short: "翻译默写", icon: Keyboard },
};

export function DailyPractice() {
  const { data, error, isLoading, mutate } = useSWR("/api/practice/today", fetcher, { revalidateOnFocus: false });
  const [mode, setMode] = useState<"overview" | "session" | "complete">("overview");
  const { currentIndex, selectedAnswer, setSelectedAnswer, begin, next } = usePracticeStore();
  const [result, setResult] = useState<PracticeQuestion | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <UnavailableState error={error} onRetry={() => mutate()} />;
  if (mode === "complete" || (mode === "overview" && data.summary.completed)) return <CompleteState data={data} />;
  if (mode === "overview") return <PracticeOverview data={data} onStart={() => { const index = Math.max(0, data.questions.findIndex((question) => !question.answered)); begin(index); setResult(data.questions[index]?.answered ? data.questions[index] : null); setMode("session"); }} />;

  const question = data.questions[currentIndex];
  if (!question) return <CompleteState data={data} />;
  const shownQuestion = result?.id === question.id ? result : question;
  const answered = shownQuestion.answered;
  const isDictation = question.type === "listening_dictation" || question.type === "translation_dictation";

  async function submitAnswer() {
    const answer = selectedAnswer.trim();
    if (!answer) return;
    setSubmitting(true);
    try {
      const response = await api.post<PracticeAnswerData>("/api/practice/answer", { questionId: question.id, answer });
      setResult(response.data.question);
      await mutate((current) => current ? {
        ...current,
        questions: current.questions.map((item) => item.id === response.data.question.id ? response.data.question : item),
        summary: response.data.summary,
        practice: { ...current.practice, status: response.data.summary.completed ? "completed" : "in_progress" },
      } : current, { revalidate: false });
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message ?? "提交失败，请稍后重试";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!data) return;
    const nextIndex = data.questions.findIndex((item, index) => index > currentIndex && !item.answered);
    setResult(null);
    if (nextIndex < 0) {
      setMode("complete");
      return;
    }
    next(nextIndex);
  }

  const meta = TYPE_META[question.type];
  const MetaIcon = meta.icon;
  const progress = Math.round((data.summary.answered / Math.max(1, data.summary.total)) * 100);

  return (
    <div className="mx-auto max-w-xl pb-6">
      <header className="mb-5 flex items-center gap-3">
        <button onClick={() => { setResult(null); setMode("overview"); }} aria-label="退出练习" className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-card text-muted"><X className="size-5" /></button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div>
        <span className="w-12 text-right text-xs font-bold text-muted">{currentIndex + 1}/{data.summary.total}</span>
      </header>

      <section className="relative min-h-[280px] overflow-hidden rounded-2xl border border-line bg-card px-5 py-6 text-center shadow-sm">
        <PawDecoration />
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand"><MetaIcon className="size-3.5" />{meta.label}</span>
        {(question.type === "listening_choice" || question.type === "listening_dictation") ? (
          <PracticeAudioButton word={question.audioText ?? ""} />
        ) : (
          <div className="relative mt-9"><p className="text-xs font-semibold text-muted">{question.type === "translation_dictation" ? "请默写对应单词" : "请选择对应答案"}</p><h1 className="mx-auto mt-3 max-w-md text-2xl font-bold leading-9 tracking-normal">{question.prompt}</h1></div>
        )}
      </section>

      <section className="mt-4">
        {isDictation ? (
          <label className="block"><span className="sr-only">输入英文单词</span><input autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={answered} value={answered ? shownQuestion.selectedAnswer ?? "" : selectedAnswer} onChange={(event) => setSelectedAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && selectedAnswer.trim()) submitAnswer(); }} placeholder="输入英文单词" className={cn("h-14 w-full rounded-2xl border bg-card px-4 text-center text-lg font-bold outline-none transition focus:border-brand focus:ring-4 focus:ring-pink-100", answered && shownQuestion.isCorrect ? "border-emerald-400" : answered ? "border-red-300" : "border-line")} /></label>
        ) : (
          <div className="grid gap-2.5">{question.options.map((option, index) => { const chosen = (answered ? shownQuestion.selectedAnswer : selectedAnswer) === option; const correct = answered && option === shownQuestion.correctAnswer; const wrong = answered && chosen && !shownQuestion.isCorrect; return <button key={`${option}-${index}`} disabled={answered} onClick={() => setSelectedAnswer(option)} className={cn("flex min-h-13 w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left text-sm font-semibold transition", !answered && chosen && "border-brand bg-brand-soft text-brand ring-2 ring-pink-100", correct && "border-emerald-400 bg-emerald-50 text-emerald-800", wrong && "border-red-300 bg-red-50 text-red-700")}><span className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-background text-xs", chosen && !answered && "bg-brand text-white", correct && "bg-emerald-500 text-white", wrong && "bg-red-500 text-white")}>{correct ? <Check className="size-4" /> : wrong ? <X className="size-4" /> : String.fromCharCode(65 + index)}</span><span className="min-w-0 break-words">{option}</span></button>; })}</div>
        )}
      </section>

      {answered && <AnswerFeedback question={shownQuestion} />}

      <div className="sticky bottom-24 z-10 mt-5 rounded-2xl bg-background/90 pb-2 pt-2 backdrop-blur sm:bottom-4">
        {!answered ? <button disabled={!selectedAnswer.trim() || submitting} onClick={submitAnswer} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-white shadow-lg shadow-pink-200 transition disabled:cursor-not-allowed disabled:opacity-40">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <PawPrint className="size-4" />}提交答案</button> : <button onClick={goNext} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-white shadow-lg shadow-pink-200">{data.summary.remaining ? <>下一题<ArrowRight className="size-4" /></> : <>查看成绩<Sparkles className="size-4" /></>}</button>}
      </div>
    </div>
  );
}

function PracticeOverview({ data, onStart }: { data: PracticeTodayData; onStart: () => void }) {
  return <div className="pb-4"><div className="mb-6"><p className="text-sm text-muted">把记住变成会用</p><h1 className="mt-1 text-2xl font-bold tracking-tight">每日一练</h1></div><section className="relative overflow-hidden rounded-2xl bg-brand p-5 text-white shadow-lg shadow-pink-200"><PawDecoration light /><div className="relative"><div className="flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">今日挑战</span><Cat className="size-6" /></div><div className="mt-8 flex items-end gap-2"><strong className="text-4xl">{data.summary.remaining}</strong><span className="mb-1 text-sm text-white/80">题待完成</span></div><p className="mt-2 text-xs text-white/75">已答 {data.summary.answered}/{data.summary.total} · 当前正确率 {data.summary.accuracy}%</p><button onClick={onStart} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-brand"><PawPrint className="size-4" />{data.summary.answered ? "继续练习" : "开始练习"}</button></div></section><section className="mt-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">今天练什么</h2><span className="text-xs text-muted">每类 3 题</span></div><div className="grid grid-cols-2 gap-3">{(Object.entries(TYPE_META) as [PracticeType, (typeof TYPE_META)[PracticeType]][]).map(([type, meta], index) => { const Icon = meta.icon; return <div key={type} className={cn("flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-card p-3", index === 4 && "col-span-2")}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /></span><div><p className="text-sm font-bold">{meta.short}</p><p className="mt-1 text-[11px] text-muted">{meta.label}</p></div></div>; })}</div></section></div>;
}

function AnswerFeedback({ question }: { question: PracticeQuestion }) {
  return <section className={cn("mt-4 rounded-2xl border p-4", question.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}><div className="flex items-center gap-2">{question.isCorrect ? <CheckCircle2 className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-red-500" />}<p className={cn("font-bold", question.isCorrect ? "text-emerald-800" : "text-red-700")}>{question.isCorrect ? "答对啦" : "再记一次"}</p></div>{!question.isCorrect && <p className="mt-2 text-sm text-red-700">正确答案：<strong>{question.correctAnswer}</strong></p>}{question.explanation && <div className="mt-3 border-t border-black/5 pt-3"><div className="flex items-baseline gap-2"><strong>{question.explanation.spelling}</strong><span className="text-xs text-muted">{question.explanation.phonetic}</span></div><p className="mt-1 text-sm leading-6 text-foreground">{question.explanation.definition}</p>{question.explanation.example && <p className="mt-1 text-xs leading-5 text-muted">{question.explanation.example}</p>}</div>}</section>;
}

function PracticeAudioButton({ word }: { word: string }) {
  const audio = useWordAudio(word);
  return <div className="relative mt-8"><button type="button" onClick={audio.play} aria-label="播放题目发音" aria-busy={audio.isLoading} className={cn("mx-auto grid size-20 place-items-center rounded-full bg-brand text-white shadow-lg shadow-pink-200 transition active:scale-95", audio.isPlaying && "ring-4 ring-brand-soft")}>{audio.isLoading ? <LoaderCircle className="size-7 animate-spin" /> : <Volume2 className={cn("size-8", audio.isPlaying && "animate-pulse")} />}</button><p className={cn("mt-4 text-sm", audio.status === "error" ? "text-red-600" : audio.status === "needs-interaction" ? "font-semibold text-brand" : "text-muted")}>{audio.message}</p></div>;
}

function CompleteState({ data }: { data: PracticeTodayData }) {
  const wrongQuestions = data.questions.filter((question) => question.isCorrect === false);
  return <div className="grid min-h-[70vh] place-items-center py-6 text-center"><div className="w-full max-w-sm"><div className="relative mx-auto grid size-24 place-items-center rounded-full bg-brand-soft text-brand"><Dog className="size-11" /><span className="absolute -right-1 top-0 grid size-8 place-items-center rounded-full bg-emerald-500 text-white"><Check className="size-4" /></span></div><p className="mt-6 text-sm text-muted">今日练习完成</p><h1 className="mt-1 text-3xl font-bold">正确率 {data.summary.accuracy}%</h1><div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-card py-4"><ResultStat value={data.summary.correct} label="答对" /><ResultStat value={data.summary.incorrect} label="待巩固" /><ResultStat value={data.summary.total} label="总题数" /></div>{wrongQuestions.length > 0 && <div className="mt-4 rounded-2xl border border-line bg-card p-4 text-left"><div className="flex items-center gap-2 text-sm font-bold"><RotateCcw className="size-4 text-brand" />今日错词</div><div className="mt-3 flex flex-wrap gap-2">{wrongQuestions.map((question) => <span key={question.id} className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{question.explanation?.spelling ?? question.correctAnswer}</span>)}</div><p className="mt-3 text-[11px] text-muted">已安排 10 分钟后再次复习</p></div>}<Link href="/study" className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-bold text-white"><PawPrint className="size-4" />返回今日学习</Link></div></div>;
}

function PawDecoration({ light = false }: { light?: boolean }) { return <><PawPrint className={cn("absolute -right-3 -top-3 size-20 rotate-12", light ? "text-white/10" : "text-brand/5")} /><PawPrint className={cn("absolute -bottom-5 left-2 size-14 -rotate-12", light ? "text-white/10" : "text-brand/5")} /></>; }
function ResultStat({ value, label }: { value: number; label: string }) { return <div><strong className="text-xl">{value}</strong><span className="mt-1 block text-[11px] text-muted">{label}</span></div>; }
function LoadingState() { return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-7 animate-spin text-brand" /></div>; }
function UnavailableState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const response = isAxiosError<PracticeApiError>(error) ? error.response : undefined;
  const details = response?.data;
  const needsStudy = details?.code === "NO_LEARNED_WORDS" || response?.status === 409;
  const needsLogin = response?.status === 401;
  const title = needsStudy ? "先学会一个单词吧" : needsLogin ? "登录状态已失效" : details?.message ?? "每日一练加载失败";
  const action = needsLogin
    ? "请重新登录后继续练习。"
    : details?.action ?? "请检查网络后重新加载，已经完成的题目不会丢失。";

  return <div className="grid min-h-[65vh] place-items-center text-center"><div className="max-w-xs"><div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-soft text-brand"><Cat className="size-8" /></div><h1 className="mt-5 text-xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-muted">{action}</p>{needsStudy || needsLogin ? <Link href={needsStudy ? "/study" : "/login"} className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-bold text-white">{needsStudy ? "去完成今日学习" : "重新登录"}</Link> : <button onClick={onRetry} className="mt-6 h-11 rounded-2xl bg-brand px-6 text-sm font-bold text-white">重新加载</button>}</div></div>;
}
