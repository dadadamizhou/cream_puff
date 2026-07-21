"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LoaderCircle, Minus, Moon, Plus, Sun, Target } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { api } from "@/lib/api";
import { settingsSchema, type SettingsInput } from "@/lib/validation/study";
import { cn } from "@/lib/utils";

const PRESETS = [30, 60, 90, 120] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const { data } = useSWR<SettingsInput>("/api/settings", (url: string) => api.get(url).then((response) => response.data));
  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { weeklyGoal: 60 },
  });
  const weeklyGoal = useWatch({ control: form.control, name: "weeklyGoal" });

  useEffect(() => {
    if (data) form.reset({ weeklyGoal: data.weeklyGoal });
  }, [data, form]);

  function chooseAmount(value: number) {
    form.setValue("weeklyGoal", value, { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: SettingsInput) {
    setSaving(true);
    try {
      await api.patch("/api/settings", values);
      form.reset(values);
      toast.success(`每周目标已改为 ${values.weeklyGoal} 个词`);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "更新失败，请稍后再试";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-4">
      <div className="mb-6">
        <p className="text-sm text-muted">按自己的节奏，长期坚持</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">学习设置</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Target className="size-5" /></div>
            <div>
              <h2 className="font-bold">每周新词目标</h2>
              <p className="mt-1 text-xs leading-5 text-muted">系统会均摊到每天；到期复习量仍由记忆情况自动决定。</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-background p-3">
            <button type="button" aria-label="减少每周目标" onClick={() => chooseAmount(Math.max(20, weeklyGoal - 10))} disabled={weeklyGoal <= 20} className="grid size-11 place-items-center rounded-xl border border-line bg-card text-foreground disabled:opacity-30"><Minus className="size-4" /></button>
            <div className="text-center"><strong className="text-3xl tracking-tight">{weeklyGoal}</strong><span className="ml-1 text-sm text-muted">个/周</span><p className="mt-1 text-[11px] text-muted">平均每天约 {Math.ceil(weeklyGoal / 7)} 个新词</p></div>
            <button type="button" aria-label="增加每周目标" onClick={() => chooseAmount(Math.min(350, weeklyGoal + 10))} disabled={weeklyGoal >= 350} className="grid size-11 place-items-center rounded-xl border border-line bg-card text-foreground disabled:opacity-30"><Plus className="size-4" /></button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {PRESETS.map((value) => <button type="button" key={value} onClick={() => chooseAmount(value)} className={cn("h-10 rounded-xl border border-line text-xs font-bold transition", weeklyGoal === value && "border-brand bg-brand-soft text-brand")}>{value}</button>)}
          </div>
          {form.formState.errors.weeklyGoal && <p className="mt-2 text-xs text-red-500">{form.formState.errors.weeklyGoal.message}</p>}

          <button disabled={saving || !form.formState.isDirty} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40">
            {saving && <LoaderCircle className="size-4 animate-spin" />}保存每周目标
          </button>
        </section>
      </form>

      <section className="mt-5 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-bold">外观</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {([{ id: "light", label: "浅色", icon: Sun }, { id: "dark", label: "深色", icon: Moon }, { id: "system", label: "跟随系统", icon: Check }] as const).map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setTheme(id)} className={cn("flex h-12 items-center justify-center gap-1.5 rounded-xl border border-line text-xs font-semibold", theme === id && "border-brand bg-brand-soft text-brand")}><Icon className="size-4" />{label}</button>)}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-bold">关于泡芙</h2>
        <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">词库</span><span className="font-semibold">高中核心 3500 词</span></div>
        <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted">复习模型</span><span className="font-semibold">间隔复习 v1</span></div>
        <p className="mt-5 text-xs leading-5 text-muted">每周目标会平滑分配到每天；泡芙再根据你的反馈安排到期复习。</p>
      </section>
    </div>
  );
}
