"use client";

import useSWR from "swr";
import { Award, BookMarked, Flame, LoaderCircle, Target } from "lucide-react";
import { api } from "@/lib/api";
import type { TodayData } from "@/types/study";

const fetcher = (url: string) => api.get<TodayData>(url).then((response) => response.data);

export default function ProgressPage() {
  const { data, isLoading } = useSWR("/api/study/today", fetcher);
  if (isLoading || !data) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-7 animate-spin text-brand" /></div>;
  const pct = Math.min(100, Math.round((data.week.assigned / Math.max(1, data.week.goal)) * 100));
  const phaseCounts = [sumStages(data, [0]), sumStages(data, [1, 2]), sumStages(data, [3, 4, 5]), sumStages(data, [6])];
  return <div className="pb-4"><div className="mb-6"><p className="text-sm text-muted">看见每天的积累</p><h1 className="mt-1 text-2xl font-bold tracking-tight">我的进度</h1></div><section className="rounded-2xl border border-line bg-card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-muted">本周完成度</p><p className="mt-2 text-3xl font-bold">{data.week.assigned}<span className="ml-1 text-base font-normal text-muted">/ {data.week.goal} 词</span></p></div><div className="grid size-16 place-items-center rounded-full" style={{ background: `conic-gradient(var(--brand) ${pct}%, var(--line) 0)` }}><div className="grid size-12 place-items-center rounded-full bg-card text-sm font-bold">{pct}%</div></div></div><div className="mt-5 grid grid-cols-3 divide-x divide-line"><Metric icon={<BookMarked className="size-4" />} value={data.overall.learned} label="累计学过" /><Metric icon={<Award className="size-4" />} value={data.overall.mastered} label="长期掌握" /><Metric icon={<Flame className="size-4" />} value={data.streak} label="连续打卡" /></div></section><section className="mt-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">记忆阶段</h2><span className="text-xs text-muted">越深越稳</span></div><div className="space-y-3">{["初次见面", "短期巩固", "间隔复习", "长期掌握"].map((label, index) => { const count = phaseCounts[index]; return <div key={label} className="rounded-xl border border-line bg-card p-4"><div className="flex items-center justify-between text-sm"><span className="font-semibold">{label}</span><span className="font-bold text-brand">{count} 个</span></div><div className="mt-3 h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, count / Math.max(1, data.overall.learned) * 100)}%` }} /></div></div>; })}</div></section><section className="mt-5 rounded-2xl bg-[#102f6b] p-5 text-white"><div className="flex items-start gap-3"><Target className="mt-0.5 size-5 text-blue-200" /><div><h2 className="font-bold">保持节奏，比冲刺更重要</h2><p className="mt-2 text-xs leading-5 text-blue-100">抗遗忘的关键不是一天背很多，而是在刚要忘记前重新遇见。你已经连续打卡 {data.streak} 天。</p></div></div></section></div>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) { return <div className="text-center"><div className="mx-auto grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">{icon}</div><p className="mt-2 text-lg font-bold">{value}</p><p className="mt-0.5 text-[11px] text-muted">{label}</p></div>; }
function sumStages(data: TodayData, stages: number[]) { return data.stageCounts.filter((entry) => stages.includes(entry.stage)).reduce((total, entry) => total + entry.count, 0); }
