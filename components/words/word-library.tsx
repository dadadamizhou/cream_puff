"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpenCheck, Brain, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Library, LoaderCircle, PawPrint, Search } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { WordLibraryBook, WordLibraryData, WordLibraryScope, WordLibraryStatus } from "@/types/word-library";
import { getWordBook, WORD_BOOKS } from "@/lib/word-books";

const searchSchema = z.object({ q: z.string().trim().max(40, "搜索内容过长") });
type SearchInput = z.infer<typeof searchSchema>;

const FILTERS: Array<{ id: WordLibraryStatus; label: string }> = [
  { id: "all", label: "全部" },
  { id: "learned", label: "已学" },
  { id: "learning", label: "复习中" },
  { id: "mastered", label: "已掌握" },
  { id: "unlearned", label: "待学习" },
  { id: "scheduled", label: "本周安排" },
];
const BOOK_FILTERS: Array<{ id: WordLibraryBook; label: string }> = [{ id: "all", label: "全部词库" }, ...WORD_BOOKS.map((book) => ({ id: book.id, label: book.shortLabel }))];

export function WordLibrary({ initialStatus, initialScope, initialDate, initialBook }: { initialStatus: WordLibraryStatus; initialScope: WordLibraryScope; initialDate: string | null; initialBook: WordLibraryBook }) {
  const [status, setStatus] = useState(initialStatus);
  const [book, setBook] = useState(initialBook);
  const [scope, setScope] = useState(initialScope);
  const [date, setDate] = useState(initialDate);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const form = useForm<SearchInput>({ resolver: zodResolver(searchSchema), defaultValues: { q: "" } });
  const endpoint = `/api/words?status=${status}&book=${book}&scope=${scope}&q=${encodeURIComponent(query)}&page=${page}&pageSize=30${date ? `&date=${date}` : ""}`;
  const { data, error, isLoading, mutate } = useSWR(endpoint, (url: string) => api.get<WordLibraryData>(url).then((response) => response.data), { keepPreviousData: true });

  function changeFilter(nextStatus: WordLibraryStatus) {
    setStatus(nextStatus);
    setScope(nextStatus === "scheduled" ? "week" : "all");
    setDate(null);
    setPage(1);
  }

  function search(values: SearchInput) {
    setQuery(values.q);
    setPage(1);
  }

  const dayLabel = date ? formatDateLabel(date) : null;

  return <div className="pb-4"><header className="mb-5 flex items-center gap-3"><Link href="/study" aria-label="返回学习首页" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-card text-muted"><ArrowLeft className="size-5" /></Link><div><p className="text-sm text-muted">{scope === "day" && dayLabel ? `${dayLabel}的真实学习记录` : "每个词都有自己的进度"}</p><h1 className="mt-0.5 text-2xl font-bold tracking-tight">我的词库</h1></div></header>

    <section className="relative overflow-hidden rounded-2xl bg-brand p-5 text-white shadow-lg shadow-pink-200/70"><PawPrint className="absolute -right-3 -top-4 size-20 rotate-12 text-white/10" /><div className="relative"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-white/80">{book === "all" ? "高中分级 + 四级拓展" : getWordBook(book).label}</span><Library className="size-5" /></div><div className="mt-4 flex items-end gap-2"><strong className="text-4xl">{data ? data.summary.total : "--"}</strong><span className="mb-1 text-sm text-white/75">个单词</span></div><div className="mt-5 grid grid-cols-3 divide-x divide-white/20"><Summary value={data?.summary.learned ?? 0} label="已学" /><Summary value={data?.summary.mastered ?? 0} label="已掌握" /><Summary value={data?.summary.remaining ?? 0} label="待学习" /></div></div></section>

    <form onSubmit={form.handleSubmit(search)} className="mt-4"><label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-card px-3 focus-within:border-brand focus-within:ring-4 focus-within:ring-pink-100"><Search className="size-4 shrink-0 text-muted" /><input {...form.register("q")} placeholder="搜索单词或中文释义" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" /><button className="h-9 rounded-xl bg-brand-soft px-3 text-xs font-bold text-brand">搜索</button></label>{form.formState.errors.q && <p className="mt-1 text-xs text-red-500">{form.formState.errors.q.message}</p>}</form>

    <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">{BOOK_FILTERS.map((filter) => <button key={filter.id} type="button" aria-pressed={book === filter.id} onClick={() => { setBook(filter.id); setPage(1); }} className={cn("h-10 shrink-0 rounded-full border border-line bg-card px-4 text-xs font-bold text-muted transition", book === filter.id && "border-brand bg-brand-soft text-brand")}>{filter.label}</button>)}</div>
    <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">{FILTERS.map((filter) => <button key={filter.id} type="button" aria-pressed={status === filter.id} onClick={() => changeFilter(filter.id)} className={cn("h-9 shrink-0 rounded-full border border-line bg-card px-3 text-[11px] font-bold text-muted transition", status === filter.id && "border-brand bg-brand-soft text-brand")}>{filter.label}</button>)}</div>

    {scope === "day" && dayLabel && <div className="mt-4 flex items-center gap-3 rounded-2xl border border-pink-200 bg-brand-soft px-4 py-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-brand"><CalendarDays className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{dayLabel}学习记录</p><p className="mt-0.5 text-[11px] text-muted">只显示当天真正复习过的单词</p></div></div>}

    <div className="mt-4 flex items-center justify-between"><p className="text-sm font-bold">{scope === "day" ? "当天已复习" : FILTERS.find((filter) => filter.id === status)?.label}<span className="ml-1 text-xs font-normal text-muted">{data ? `(${data.pagination.total})` : ""}</span></p>{scope !== "all" && <button type="button" onClick={() => { setScope("all"); setDate(null); setPage(1); }} className="min-h-10 rounded-xl px-2 text-xs font-semibold text-brand">查看全部词库</button>}</div>

    {isLoading && !data ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-7 animate-spin text-brand" /></div> : error ? <div className="grid min-h-64 place-items-center text-center"><div><p className="font-bold">词库加载失败</p><button onClick={() => mutate()} className="mt-4 h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white">重新加载</button></div></div> : data?.items.length ? <div className="mt-3 space-y-2.5">{data.items.map((word) => <WordRow key={word.id} word={word} />)}</div> : <EmptyState status={status} scope={scope} />}

    {data && data.pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-card p-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold text-muted disabled:opacity-30"><ChevronLeft className="size-4" />上一页</button><span className="text-xs text-muted">{page} / {data.pagination.totalPages}</span><button disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="flex h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold text-brand disabled:opacity-30">下一页<ChevronRight className="size-4" /></button></div>}
  </div>;
}

function WordRow({ word }: { word: WordLibraryData["items"][number] }) {
  const meta = word.status === "mastered" ? { label: "已掌握", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" } : word.status === "learning" ? { label: `第 ${(word.stage ?? 0) + 1} 阶`, icon: Brain, className: "bg-brand-soft text-brand" } : { label: "待学习", icon: BookOpenCheck, className: "bg-background text-muted" };
  const Icon = meta.icon;
  return <article className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-card p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-x-2"><h2 className="break-all text-lg font-bold">{word.spelling}</h2>{word.phonetic && <span className="text-xs text-muted">{word.phonetic}</span>}<span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted">{getWordBook(word.wordBook).shortLabel}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{word.definition}</p></div><span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold", meta.className)}><Icon className="size-3" />{meta.label}</span></article>;
}

function Summary({ value, label }: { value: number; label: string }) { return <div className="text-center"><strong className="text-xl">{value}</strong><span className="mt-1 block text-[10px] text-white/70">{label}</span></div>; }
function EmptyState({ status, scope }: { status: WordLibraryStatus; scope: WordLibraryScope }) { return <div className="grid min-h-64 place-items-center text-center"><div><div className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand"><PawPrint className="size-6" /></div><p className="mt-4 font-bold">这里还没有单词</p><p className="mt-1 text-xs text-muted">{scope === "day" ? "这一天还没有复习记录。" : status === "mastered" ? "坚持复习，掌握的词会出现在这里。" : "换一个筛选条件看看。"}</p></div></div>; }
function formatDateLabel(date: string) { const [, month, day] = date.split("-").map(Number); return `${month}月${day}日`; }
