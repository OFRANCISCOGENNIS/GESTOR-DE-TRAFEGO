"use client";
import { Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch } from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/metrics";
import type { Goal } from "@/lib/types";

export default function GoalsPage() {
  const { data, loading, error, reload } = useFetch<Goal[]>(() => api.get("/goals"));

  const fmt = (g: Goal, v: number) => g.metric === "budget" ? formatBRL(v) : g.metric === "cpa" ? formatBRL(v) : `${v}x`;
  // p/ CPA menor é melhor; p/ demais maior é melhor
  const progress = (g: Goal) => {
    if (g.metric === "cpa") return Math.min(100, (g.target / g.current) * 100);
    return Math.min(100, (g.current / g.target) * 100);
  };
  const onTrack = (g: Goal) => g.metric === "cpa" ? g.projectedEndOfMonth <= g.target : g.projectedEndOfMonth >= g.target;

  return (
    <div>
      <PageHeader title="Metas & Previsões" subtitle="Metas por cliente com barra de progresso e projeção de fim de mês pelo ritmo atual." />
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((g) => (
          <div key={g.id} className="card">
            <div className="flex items-center gap-2"><Target size={16} className="text-brand" /><span className="font-medium">{g.label}</span></div>
            <div className="mt-4 flex items-end justify-between">
              <div><p className="text-xs text-muted">Atual</p><p className="font-display text-2xl font-bold">{fmt(g, g.current)}</p></div>
              <div className="text-right"><p className="text-xs text-muted">Meta</p><p className="font-display text-lg font-semibold">{fmt(g, g.target)}</p></div>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-surface2"><div className="h-2.5 rounded-full bg-brand" style={{ width: `${progress(g)}%` }} /></div>
            <p className={`mt-3 flex items-center gap-1 text-sm ${onTrack(g) ? "text-good" : "text-warn"}`}>
              <TrendingUp size={14} /> Projeção fim do mês: <b>{fmt(g, g.projectedEndOfMonth)}</b> — {onTrack(g) ? "no ritmo da meta" : "abaixo do necessário"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
