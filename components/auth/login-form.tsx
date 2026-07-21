"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Mail, LockKeyhole, UserRound, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  type AuthFormValues = LoginInput & Partial<RegisterInput>;
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema) as Resolver<AuthFormValues>,
    defaultValues: { email: "", password: "", nickname: "" },
  });

  async function onSubmit(values: LoginInput & Partial<RegisterInput>) {
    setLoading(true);
    try {
      await api.post(mode === "login" ? "/api/auth/login" : "/api/auth/register", values);
      toast.success(mode === "login" ? "欢迎回来，今天也一起坚持" : "账号创建成功，开始你的第一个任务");
      router.replace("/study");
      router.refresh();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "操作失败，请稍后再试";
      toast.error(message);
    } finally { setLoading(false); }
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="mb-8 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-blue-200"><Sparkles className="size-5" /></div><div><p className="text-lg font-bold tracking-tight">拾词</p><p className="text-xs text-muted">每天跟读一点，记住该记的</p></div></div>
      <div className="rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-7"><h1 className="text-2xl font-bold tracking-tight">{mode === "login" ? "继续你的学习" : "建立你的词库"}</h1><p className="mt-2 text-sm leading-6 text-muted">用一周 60 个词的节奏，把高中三年词汇拆成每天可完成的一小步。</p></div>
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-background p-1"><button type="button" onClick={() => { setMode("login"); form.reset(); }} className={cn("h-10 rounded-lg text-sm font-semibold transition", mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted")}>登录</button><button type="button" onClick={() => { setMode("register"); form.reset(); }} className={cn("h-10 rounded-lg text-sm font-semibold transition", mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted")}>注册</button></div>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          {mode === "register" && <Field icon={<UserRound className="size-4" />} label="昵称" error={form.formState.errors.nickname?.message}><input {...form.register("nickname")} placeholder="例如：小林" className="field-input" /></Field>}
          <Field icon={<Mail className="size-4" />} label="邮箱" error={form.formState.errors.email?.message}><input type="email" autoComplete="email" {...form.register("email")} placeholder="you@example.com" className="field-input" /></Field>
          <Field icon={<LockKeyhole className="size-4" />} label="密码" error={form.formState.errors.password?.message}><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} {...form.register("password")} placeholder="至少 8 位" className="field-input" /></Field>
          <button disabled={loading} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <>{mode === "login" ? "进入学习" : "创建账号"}<ArrowRight className="size-4" /></>}</button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-muted">继续即表示你同意拾词仅用于学习进度记录，不会出售你的个人数据。</p>
      </div>
      <p className="mt-6 text-center text-xs text-muted">高中英语 3500 词 · 抗遗忘复习 · 跟读打卡</p>
    </section>
  );
}

function Field({ icon, label, error, children }: { icon: React.ReactNode; label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">{icon}{label}</span><div className="field-wrap">{children}</div>{error && <span className="mt-1 block text-xs text-red-500">{error}</span>}</label>;
}
