import { Cat, Heart, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <header className="app-topbar border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <div className="flex min-h-11 items-center gap-2.5">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--brand)_28%,transparent)]">
              <Cat className="size-5" strokeWidth={2.3} aria-hidden="true" />
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border-2 border-background bg-card text-brand">
                <Heart className="size-2.5 fill-current" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </span>
            <span>
              <span className="block text-[15px] font-extrabold leading-5">泡芙</span>
              <span className="block text-[10px] font-medium leading-3 text-muted">今天也要记牢</span>
            </span>
          </div>

          <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand" aria-hidden="true">
            <Sparkles className="size-[18px]" />
          </span>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-md px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 min-[360px]:px-4 sm:pt-8">
        <Cat
          className="pointer-events-none absolute -right-8 top-6 -z-10 size-24 rotate-6 text-brand/5"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <LoginForm />
      </main>
    </div>
  );
}
