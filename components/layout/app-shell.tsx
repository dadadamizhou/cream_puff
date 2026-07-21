"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenCheck, ChartNoAxesColumnIncreasing, LogOut, Settings2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AppShell({ user, children }: { user: { nickname: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [{ href: "/study", label: "学习", icon: BookOpenCheck }, { href: "/progress", label: "进度", icon: ChartNoAxesColumnIncreasing }, { href: "/settings", label: "设置", icon: Settings2 }];
  async function logout() { await api.post("/api/auth/logout"); toast.success("已退出登录"); router.replace("/login"); router.refresh(); }
  return <div className="min-h-dvh"><header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5"><Link href="/study" className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-xl bg-brand text-white"><Sparkles className="size-4" /></span><span className="font-bold tracking-tight">拾词</span></Link><div className="flex items-center gap-3"><span className="hidden text-sm text-muted sm:block">{user.nickname}</span><button onClick={logout} aria-label="退出登录" className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-card hover:text-foreground"><LogOut className="size-4" /></button></div></header><main className="mx-auto max-w-5xl px-4 pb-28 sm:px-6">{children}</main><nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur sm:static sm:mx-auto sm:max-w-5xl sm:border-0 sm:bg-transparent sm:pb-8 sm:pt-8 sm:backdrop-blur-none"><div className="mx-auto grid max-w-md grid-cols-3 px-4 sm:max-w-xs sm:gap-2 sm:rounded-2xl sm:border sm:border-line sm:bg-card sm:p-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-muted transition sm:h-10 sm:flex-row sm:gap-2", pathname.startsWith(href) && "bg-brand-soft text-brand")}><Icon className="size-5 sm:size-4" />{label}</Link>)}</div></nav></div>;
}
