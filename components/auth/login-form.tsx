"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Cat,
  CircleAlert,
  Eye,
  EyeOff,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Mail,
  PawPrint,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";
type AuthFormValues = LoginInput & Partial<RegisterInput>;

const DEFAULT_VALUES: AuthFormValues = {
  email: "",
  password: "",
  nickname: "",
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema) as Resolver<AuthFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  function changeMode(nextMode: AuthMode) {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setShowPassword(false);
    form.reset(DEFAULT_VALUES);
  }

  async function onSubmit(values: AuthFormValues) {
    form.clearErrors("root");
    setLoading(true);

    try {
      const body = mode === "login"
        ? { email: values.email, password: values.password }
        : { email: values.email, password: values.password, nickname: values.nickname };

      await api.post(mode === "login" ? "/api/auth/login" : "/api/auth/register", body);
      toast.success(mode === "login" ? "欢迎回来，继续今天的学习" : "账号创建成功，开始学习吧");
      router.replace("/study");
      router.refresh();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? "操作失败，请稍后再试";
      form.setError("root.server", { type: "server", message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const serverError = form.formState.errors.root?.server?.message;

  return (
    <section className="w-full" aria-labelledby="auth-title">
      <div className="mb-5 px-1">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand">
          {mode === "login" ? <PawPrint className="size-3.5 fill-current" /> : <Sparkles className="size-3.5" />}
          <span>{mode === "login" ? "回来啦" : "第一次见面"}</span>
        </div>
        <h1 id="auth-title" className="text-2xl font-extrabold leading-tight">
          {mode === "login" ? "继续今天的学习" : "创建你的泡芙账号"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "login" ? "登录后，从上次停下的地方继续。" : "保存每一次学习和复习进度。"}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[1.5rem] border border-line bg-card p-4 shadow-[0_16px_42px_var(--nav-shadow)] min-[380px]:p-5 sm:p-6">
        <PawPrint
          className="pointer-events-none absolute -right-3 -top-3 size-16 rotate-12 text-brand/5"
          aria-hidden="true"
        />

        <div className="relative mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-background p-1" role="tablist" aria-label="账号操作">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            disabled={loading}
            onClick={() => changeMode("login")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
              mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {mode === "login" && <PawPrint className="size-3.5 fill-current text-brand" aria-hidden="true" />}
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            disabled={loading}
            onClick={() => changeMode("register")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
              mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {mode === "register" && <PawPrint className="size-3.5 fill-current text-brand" aria-hidden="true" />}
            注册
          </button>
        </div>

        <form
          className="relative space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          aria-busy={loading}
        >
          {mode === "register" && (
            <Field
              id="nickname"
              icon={<UserRound className="size-[18px]" />}
              label="昵称"
              error={form.formState.errors.nickname?.message}
            >
              <input
                id="nickname"
                type="text"
                autoComplete="nickname"
                disabled={loading}
                aria-invalid={Boolean(form.formState.errors.nickname)}
                aria-describedby={form.formState.errors.nickname ? "nickname-error" : undefined}
                {...form.register("nickname")}
                placeholder="怎么称呼你"
                className="field-input h-12 min-w-0 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>
          )}

          <Field
            id="email"
            icon={<Mail className="size-[18px]" />}
            label="邮箱"
            error={form.formState.errors.email?.message}
          >
            <input
              id="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              disabled={loading}
              aria-invalid={Boolean(form.formState.errors.email)}
              aria-describedby={form.formState.errors.email ? "email-error" : undefined}
              {...form.register("email")}
              placeholder="name@example.com"
              className="field-input h-12 min-w-0 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </Field>

          <Field
            id="password"
            icon={<LockKeyhole className="size-[18px]" />}
            label="密码"
            error={form.formState.errors.password?.message}
          >
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={loading}
              aria-invalid={Boolean(form.formState.errors.password)}
              aria-describedby={form.formState.errors.password ? "password-error" : undefined}
              {...form.register("password")}
              placeholder="至少 8 位"
              className="field-input h-12 min-w-0 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={loading}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              title={showPassword ? "隐藏密码" : "显示密码"}
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </Field>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_color-mix(in_srgb,var(--brand)_28%,transparent)] transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {loading ? (
              <>
                <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
                <span>{mode === "login" ? "正在登录..." : "正在创建..."}</span>
              </>
            ) : (
              <>
                <PawPrint className="size-4 fill-current" aria-hidden="true" />
                <span>{mode === "login" ? "进入泡芙" : "创建账号"}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 px-4 text-center text-xs leading-5 text-muted">
        <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
          <Cat className="size-4" />
          <Heart className="absolute -right-0.5 -top-0.5 size-2.5 fill-current" />
        </span>
        <span>慢慢来，记牢比记快更重要。</span>
      </div>
    </section>
  );
}

function Field({
  id,
  icon,
  label,
  error,
  children,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground">
        {label}
      </label>
      <div
        className={cn(
          "field-wrap min-h-13 gap-2.5 py-0 pr-1",
          error && "border-red-400 focus-within:border-red-500 focus-within:shadow-[0_0_0_3px_rgb(239_68_68_/_0.12)]",
        )}
      >
        <span className={cn("shrink-0 text-muted", error && "text-red-500")} aria-hidden="true">
          {icon}
        </span>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
