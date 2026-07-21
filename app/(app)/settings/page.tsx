"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookMarked, Check, LoaderCircle, MapPin, Minus, Moon, Plus, Sun, Target } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { api } from "@/lib/api";
import { settingsSchema, type SettingsInput } from "@/lib/validation/study";
import { cn } from "@/lib/utils";
import { WORD_BOOK_IDS, WORD_BOOKS, type WordBookId } from "@/lib/word-books";

const PRESETS = [30, 60, 90, 120] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const { data } = useSWR<SettingsInput>("/api/settings", (url: string) => api.get(url).then((response) => response.data));
  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { weeklyGoal: 60, enabledWordBooks: [...WORD_BOOK_IDS] },
  });
  const weeklyGoal = useWatch({ control: form.control, name: "weeklyGoal" });
  const enabledWordBooks = useWatch({ control: form.control, name: "enabledWordBooks" });

  useEffect(() => {
    if (data) form.reset({ weeklyGoal: data.weeklyGoal, enabledWordBooks: data.enabledWordBooks });
  }, [data, form]);

  function chooseAmount(value: number) {
    form.setValue("weeklyGoal", value, { shouldDirty: true, shouldValidate: true });
  }

  function toggleWordBook(wordBook: WordBookId) {
    const selected = new Set(enabledWordBooks);
    if (selected.has(wordBook)) {
      if (selected.size === 1) { toast.info("请至少保留一个学习词库"); return; }
      selected.delete(wordBook);
    } else selected.add(wordBook);
    form.setValue("enabledWordBooks", WORD_BOOK_IDS.filter((id) => selected.has(id)), { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: SettingsInput) {
    setSaving(true);
    try {
      await api.patch("/api/settings", values);
      form.reset(values);
      toast.success("学习计划已保存");
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

        </section>

        <section className="mt-5 rounded-2xl border border-line bg-card p-5">
          <div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><BookMarked className="size-5" /></div><div><h2 className="font-bold">学习词库</h2><p className="mt-1 text-xs leading-5 text-muted">按高一、高二、高三、四级的顺序推进；同一级每天随机抽词。</p></div></div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-background px-3 py-3"><MapPin className="size-4 shrink-0 text-brand" /><div><p className="text-xs font-bold">黑龙江哈尔滨 · 高中 3500 兼容模式</p><p className="mt-1 text-[11px] leading-4 text-muted">暂无学校教材版本时，采用全国高中词汇范围，不虚构课本单元。</p></div></div>
          <div className="mt-5 space-y-2">{WORD_BOOKS.map((book, index) => { const selected = enabledWordBooks.includes(book.id); return <button key={book.id} type="button" onClick={() => toggleWordBook(book.id)} className={cn("flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition", selected ? "border-brand bg-brand-soft" : "border-line bg-background")}><span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold", selected ? "bg-brand text-white" : "bg-line text-muted")}>{index + 1}</span><span className="min-w-0 flex-1"><span className={cn("block text-sm font-bold", selected && "text-brand")}>{book.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted">{book.description}</span></span><span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", selected ? "border-brand bg-brand text-white" : "border-line text-transparent")}><Check className="size-3.5" /></span></button>; })}</div>
          {form.formState.errors.enabledWordBooks && <p className="mt-2 text-xs text-red-500">{form.formState.errors.enabledWordBooks.message}</p>}
        </section>

        <button disabled={saving || !form.formState.isDirty} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40">
          {saving && <LoaderCircle className="size-4 animate-spin" />}保存学习计划
        </button>
      </form>

      <section className="mt-5 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-bold">外观</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {([{ id: "light", label: "浅色", icon: Sun }, { id: "dark", label: "深色", icon: Moon }, { id: "system", label: "跟随系统", icon: Check }] as const).map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setTheme(id)} className={cn("flex h-12 items-center justify-center gap-1.5 rounded-xl border border-line text-xs font-semibold", theme === id && "border-brand bg-brand-soft text-brand")}><Icon className="size-4" />{label}</button>)}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-bold">关于泡芙</h2>
        <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">词库</span><span className="font-semibold">高中 3500 + 四级拓展</span></div>
        <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted">复习模型</span><span className="font-semibold">间隔复习 v1</span></div>
        <p className="mt-5 text-xs leading-5 text-muted">每周目标会平滑分配到每天；泡芙再根据你的反馈安排到期复习。</p>
      </section>
    </div>
  );
}
