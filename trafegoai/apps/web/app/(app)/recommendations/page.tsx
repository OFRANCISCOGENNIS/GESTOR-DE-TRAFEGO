"use client";
import { useState } from "react";
import { Sparkles, Check, Undo2, X, Brain } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, ImpactBadge, PlatformBadge, ConfirmDialog, useToast, Empty } from "@/components/ui";
import { api } from "@/lib/api";
import type { Recommendation, Anomaly } from "@/lib/types";

export default function RecommendationsPage() {
  const diag = useFetch<{ text: string }>(() => api.get("/insights/diagnosis"));
  const recs = useFetch<Recommendation[]>(() => api.get("/insights/recommendations"));
  const anomalies = useFetch<Anomaly[]>(() => api.get("/insights/anomalies"));
  const [confirm, setConfirm] = useState<null | { rec: Recommendation }>(null);
  const { show, node } = useToast();

  const patch = (id: string, status: Recommendation["status"]) =>
    recs.setData((prev) => prev ? prev.map((r) => r.id === id ? { ...r, status } : r) : prev);

  const apply = async (r: Recommendation) => {
    await api.post(`/insights/recommendations/${r.id}/apply`);
    patch(r.id, "applied");
    show("Recomendação aplicada. Você pode desfazer.");
  };
  const undo = async (r: Recommendation) => { await api.post(`/insights/recommendations/${r.id}/undo`); patch(r.id, "open"); show("Ação desfeita."); };
  const dismiss = async (r: Recommendation) => { await api.post(`/insights/recommendations/${r.id}/dismiss`); patch(r.id, "dismissed"); };

  return (
    <div>
      <PageHeader title="Recomendações IA" subtitle="Diagnóstico automático + ações priorizadas por impacto, com aplicar em 1 clique e desfazer." />

      <div className="card mb-5 flex gap-4 border-brand/30 bg-brand/5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white"><Brain size={20} /></span>
        <div className="min-w-0">
          <h3 className="font-display font-semibold">Diagnóstico do gestor virtual</h3>
          {diag.loading && <div className="mt-2 skeleton h-16 w-full" />}
          {diag.error && <ErrorState error={diag.error} onRetry={diag.reload} />}
          {diag.data && <p className="mt-1 text-sm text-muted">{diag.data.text}</p>}
        </div>
      </div>

      {anomalies.data && anomalies.data.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 font-display font-semibold">Anomalias detectadas (z-score)</h3>
          <div className="grid gap-2 md:grid-cols-3">
            {anomalies.data.map((a) => (
              <div key={a.id} className="card border-l-4 p-3" style={{ borderLeftColor: a.severity === "alta" ? "rgb(var(--bad))" : "rgb(var(--warn))" }}>
                <div className="flex items-center justify-between text-xs text-muted"><span>{a.metric}</span><span>{a.at}</span></div>
                <p className="mt-1 text-sm">{a.message}</p>
                <p className="mt-1 text-xs text-muted">z = {a.zscore}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="mb-2 font-display font-semibold">Ações recomendadas</h3>
      {recs.loading && <Loading />}
      {recs.error && <ErrorState error={recs.error} onRetry={recs.reload} />}
      {recs.data && recs.data.length === 0 && <Empty title="Sem recomendações abertas" hint="A IA reavalia a cada sincronização." />}
      <div className="grid gap-3">
        {recs.data?.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles size={16} className="text-brand" />
                <span className="font-medium">{r.title}</span>
                <ImpactBadge impact={r.impact} />
                <PlatformBadge platform={r.platform} />
                {r.status === "applied" && <span className="badge bg-good/15 text-good">Aplicada</span>}
              </div>
              <p className="mt-2 text-sm text-muted"><b className="text-fg">Por quê:</b> {r.why}</p>
              <p className="mt-1 text-sm text-muted"><b className="text-fg">Ação:</b> {r.action} • <b className="text-good">{r.estimatedGain}</b></p>
            </div>
            <div className="flex gap-2">
              {r.status === "applied" ? (
                <button className="btn-ghost" onClick={() => undo(r)}><Undo2 size={14} /> Desfazer</button>
              ) : (
                <>
                  <button className="btn-primary" onClick={() => setConfirm({ rec: r })}><Check size={14} /> Aplicar</button>
                  <button className="btn-ghost" onClick={() => dismiss(r)} title="Dispensar"><X size={14} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog open={!!confirm} title="Aplicar recomendação?"
        description={`${confirm?.rec.action}. Esta ação altera campanha via API, exige confirmação e gera log de auditoria (você pode desfazer).`}
        confirmLabel="Aplicar agora" onConfirm={() => confirm && apply(confirm.rec)} onClose={() => setConfirm(null)} />
      {node}
    </div>
  );
}
