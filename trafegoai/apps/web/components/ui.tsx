"use client";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, RefreshCw, Inbox, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

// ── Estados de tela: loading / vazio / erro (com retry) ────────────────────────
export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="grid gap-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-20 w-full" />
      ))}
    </div>
  );
}

export function Empty({ title = "Nada por aqui ainda", hint }: { title?: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center text-muted">
      <Inbox size={28} />
      <p className="font-medium text-fg">{title}</p>
      {hint && <p className="text-sm">{hint}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <AlertTriangle className="text-bad" size={28} />
      <p className="font-medium">Não foi possível carregar</p>
      <p className="text-sm text-muted">{error}</p>
      <button className="btn-ghost" onClick={onRetry}>
        <RefreshCw size={15} /> Tentar novamente
      </button>
    </div>
  );
}

// Hook genérico de fetch com os 4 estados.
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = () => {
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || "Erro desconhecido"))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);
  return { data, error, loading, reload: run, setData };
}

// ── KPI ────────────────────────────────────────────────────────────────────────
export function KpiCard({
  label, value, delta, invert = false, format = "num",
}: {
  label: string; value: number | string; delta?: number; invert?: boolean;
  format?: "num" | "brl" | "pct" | "raw";
}) {
  const up = (delta ?? 0) >= 0;
  const good = invert ? !up : up;
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {delta !== undefined && (
        <p className={clsx("mt-1 flex items-center gap-1 text-xs font-medium", good ? "text-good" : "text-bad")}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(delta).toFixed(1)}% vs período anterior
        </p>
      )}
    </div>
  );
}

// ── Badges de status ─────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-good/15 text-good", paused: "bg-muted/15 text-muted",
    learning: "bg-warn/15 text-warn", expired: "bg-warn/15 text-warn",
    error: "bg-bad/15 text-bad",
  };
  const label: Record<string, string> = {
    active: "Ativa", paused: "Pausada", learning: "Aprendendo",
    expired: "Expirada", error: "Com erro",
  };
  return <span className={clsx("badge", map[status] || "bg-surface2 text-muted")}>{label[status] || status}</span>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    google: { label: "Google", cls: "bg-[#4285F4]/15 text-[#4285F4]" },
    meta: { label: "Meta", cls: "bg-[#0866FF]/15 text-[#3b82f6]" },
    tiktok: { label: "TikTok", cls: "bg-[#25F4EE]/15 text-[#2dd4bf]" },
  };
  const p = map[platform] || { label: platform, cls: "bg-surface2 text-muted" };
  return <span className={clsx("badge", p.cls)}>{p.label}</span>;
}

export function ImpactBadge({ impact }: { impact: string }) {
  const cls = impact === "alto" ? "bg-bad/15 text-bad" : impact === "médio" ? "bg-warn/15 text-warn" : "bg-good/15 text-good";
  return <span className={clsx("badge", cls)}>Impacto {impact}</span>;
}

// ── Diálogo de confirmação (ações que gastam dinheiro / alteram campanha) ──────
export function ConfirmDialog({
  open, title, description, confirmLabel = "Confirmar", onConfirm, onClose,
}: {
  open: boolean; title: string; description: string; confirmLabel?: string;
  onConfirm: () => void; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Toast simples
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3200);
  };
  const node = msg ? (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border bg-surface2 px-4 py-2 text-sm shadow-lg">
      {msg}
    </div>
  ) : null;
  return { show, node };
}
