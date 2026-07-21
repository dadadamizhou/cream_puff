"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Cat,
  ChartNoAxesColumnIncreasing,
  Dog,
  Heart,
  LogOut,
  PawPrint,
  Settings2,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const links = [
  { href: "/study", label: "学习", icon: BookOpenCheck },
  { href: "/practice", label: "练习", icon: PawPrint },
  { href: "/progress", label: "进度", icon: ChartNoAxesColumnIncreasing },
  { href: "/settings", label: "设置", icon: Settings2 },
];

export function AppShell({
  user,
  children,
}: {
  user: { nickname: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api.post("/api/auth/logout");
    toast.success("已退出登录");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="app-topbar sticky top-0 z-30 border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/study"
            aria-label="泡芙学习首页"
            className="group flex min-h-11 items-center gap-2.5 rounded-xl pr-2"
          >
            <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--brand)_28%,transparent)] transition-transform group-hover:-rotate-3 group-active:scale-95">
              <Cat className="size-5" strokeWidth={2.3} />
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border-2 border-background bg-card text-brand">
                <Heart className="size-2.5 fill-current" strokeWidth={2.5} />
              </span>
            </span>
            <span>
              <span className="block text-[15px] font-extrabold leading-5 tracking-normal">泡芙</span>
              <span className="block text-[10px] font-medium leading-3 text-muted">今天也要记牢</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <div className="hidden min-h-11 items-center gap-2 rounded-2xl bg-card/70 px-3 text-sm text-muted sm:flex">
              <Dog className="size-4 text-brand" aria-hidden="true" />
              <span className="max-w-32 truncate">{user.nickname}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="退出登录"
              title="退出登录"
              className="grid size-11 place-items-center rounded-2xl text-muted transition-colors hover:bg-brand-soft hover:text-brand active:bg-brand-soft"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pb-32 pt-3 sm:px-6 sm:pb-32 sm:pt-5">
        {children}
      </main>

      <nav
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[28rem] sm:-translate-x-1/2 sm:px-0 sm:pb-0"
        aria-label="主要导航"
      >
        <div className="app-nav-surface mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.5rem] border border-line bg-card/95 p-1.5 backdrop-blur-xl">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.125rem] px-1 text-[11px] font-bold text-muted transition-colors active:scale-[0.98]",
                  "hover:bg-brand-soft/70 hover:text-brand",
                  active && "bg-brand-soft text-brand",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
                {active && (
                  <PawPrint
                    className="absolute right-2 top-1.5 size-2.5 fill-current opacity-45"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
