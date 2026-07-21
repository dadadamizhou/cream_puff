"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LoaderCircle, Moon, Sun, Target } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { api } from "@/lib/api";
import { settingsSchema } from "@/lib/validation/study";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const { data } = useSWR<{ weeklyGoal: 30 | 60 | 90 }>("/api/settings", (url: string) => api.get(url).then((response) => response.data));
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ weeklyGoal: 30 | 60 | 90 }>({ resolver: zodResolver(settingsSchema), defaultValues: { weeklyGoal: 60 } });
  useEffect(() => { if (data) reset({ weeklyGoal: data.weeklyGoal }); }, [data, reset]);
  async function onSubmit(values: { weeklyGoal: 30 | 60 | 90 }) { setSaving(true); try { await api.patch("/api/settings", values); toast.success("学习目标已更新"); } catch { toast.error("更新失败，请稍后再试"); } finally { setSaving(false); } }
  return <div className="pb-4"><div className="mb-6"><p className="text-sm text-muted">让计划适合你的节奏</p><h1 className="mt-1 text-2xl font-bold tracking-tight">设置</h1></div><form onSubmit={handleSubmit(onSubmit)} className="space-y-5"><section className="rounded-2xl border border-line bg-card p-5"><div className="flex items-start gap-3"><div className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><Target className="size-4" /></div><div><h2 className="font-bold">每周新词目标</h2><p className="mt-1 text-xs leading-5 text-muted">目标越小越容易坚持，系统会自动均摊到每天。</p></div></div><div className="mt-5 grid grid-cols-3 gap-2">{([30, 60, 90] as const).map((value) => <label key={value} className="relative"><input type="radio" value={value} {...register("weeklyGoal", { valueAsNumber: true })} className="peer sr-only" /><span className="flex h-14 items-center justify-center rounded-xl border border-line text-sm font-bold transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">{value}<small className="ml-1 text-[10px] font-normal">词</small></span>{/* checked indicator handled by peer */}</label>)}</div>{errors.weeklyGoal && <p className="mt-2 text-xs text-red-500">{errors.weeklyGoal.message}</p>}<button disabled={saving} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-60">{saving && <LoaderCircle className="size-4 animate-spin" />}保存目标</button></section></form><section className="mt-5 rounded-2xl border border-line bg-card p-5"><h2 className="font-bold">外观</h2><div className="mt-4 grid grid-cols-3 gap-2">{([{ id: "light", label: "浅色", icon: Sun }, { id: "dark", label: "深色", icon: Moon }, { id: "system", label: "跟随系统", icon: Check }] as const).map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setTheme(id)} className={cn("flex h-12 items-center justify-center gap-1.5 rounded-xl border border-line text-xs font-semibold", theme === id && "border-brand bg-brand-soft text-brand")}><Icon className="size-4" />{label}</button>)}</div></section><section className="mt-5 rounded-2xl border border-line bg-card p-5"><h2 className="font-bold">关于拾词</h2><div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">词库</span><span className="font-semibold">高中英语 3500 词</span></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted">复习模型</span><span className="font-semibold">间隔复习 v1</span></div><p className="mt-5 text-xs leading-5 text-muted">拾词记录的是你的学习行为，不评价你的聪明与否。保持每天开口，记忆会在一次次回访中变得牢固。</p></section></div>;
}
