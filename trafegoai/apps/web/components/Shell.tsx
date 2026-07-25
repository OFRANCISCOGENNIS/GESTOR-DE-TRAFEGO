"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard, Radar, CalendarClock, Megaphone, Sparkles, MessageSquare,
  Workflow, Images, Target, FileText, PlugZap, ScrollText, CreditCard,
  Bell, Moon, Sun, LogOut, TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { isDemo } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/recommendations", label: "Recomendações IA", icon: Sparkles },
  { href: "/chat", label: "Assistente", icon: MessageSquare },
  { href: "/automations", label: "Automações", icon: Workflow },
  { href: "/radar", label: "Radar de Tendências", icon: Radar },
  { href: "/planner", label: "Planejador de Postagem", icon: CalendarClock },
  { href: "/creatives", label: "Criativos", icon: Images },
  { href: "/goals", label: "Metas & Previsões", icon: Target },
  { href: "/reports", label: "Relatórios", icon: FileText },
  { href: "/connections", label: "Conexões", icon: PlugZap },
  { href: "/audit", label: "Auditoria", icon: ScrollText },
  { href: "/billing", label: "Planos", icon: CreditCard },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, notifications, unread, loadNotifications, markAllRead } = useStore();
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 20000);
    return () => clearInterval(t);
  }, [loadNotifications]);

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-surface p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white"><TrendingUp size={18} /></span>
          <span className="font-display text-lg font-bold">TrafegoAI</span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={clsx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  active ? "bg-brand text-white" : "text-muted hover:bg-surface2 hover:text-fg")}>
                <Icon size={17} /> {label}
              </Link>
            );
          })}
        </nav>
        <button className="btn-ghost mt-2" onClick={() => { localStorage.removeItem("trafegoai_token"); router.push("/login"); }}>
          <LogOut size={15} /> Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-surface/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold md:hidden">TrafegoAI</span>
            {isDemo() && (
              <span className="badge bg-brand/15 text-brand">Modo demonstração</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost !px-2.5" aria-label="Alternar tema" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="relative">
              <button className="btn-ghost relative !px-2.5" aria-label="Notificações"
                onClick={() => { setBellOpen((v) => !v); if (!bellOpen) markAllRead(); }}>
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{unread}</span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border bg-surface p-2 shadow-xl">
                  <p className="px-2 py-1 text-xs font-semibold text-muted">Notificações em tempo real</p>
                  {notifications.length === 0 && <p className="px-2 py-3 text-sm text-muted">Sem novidades.</p>}
                  {notifications.slice(0, 8).map((n) => (
                    <div key={n.id} className="rounded-xl px-2 py-2 text-sm hover:bg-surface2">
                      <p>{n.message}</p>
                      <p className="text-xs text-muted">{n.at}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
