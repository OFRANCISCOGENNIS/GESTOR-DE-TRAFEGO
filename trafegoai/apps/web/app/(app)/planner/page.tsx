"use client";
import { useState } from "react";
import { CalendarClock, Sparkles, Clock } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch } from "@/components/ui";
import { api } from "@/lib/api";
import type { PostingWindow, VideoAnalysis } from "@/lib/types";

export default function PlannerPage() {
  const windows = useFetch<PostingWindow[]>(() => api.get("/radar/windows"));
  const [desc, setDesc] = useState("");
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await api.post<VideoAnalysis>("/radar/analyze", { description: desc });
      setAnalysis(res);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Planejador de Postagem" subtitle="Melhores janelas por rede + análise honesta do seu vídeo antes de publicar." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><CalendarClock size={18} className="text-brand" /> Melhores janelas de postagem</h3>
          {windows.loading && <Loading />}
          {windows.error && <ErrorState error={windows.error} onRetry={windows.reload} />}
          <div className="space-y-2">
            {windows.data?.map((w) => (
              <div key={w.network} className="rounded-xl border bg-surface2 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{w.network}</span>
                  <div className="flex gap-1.5">
                    {w.bestHours.map((h) => <span key={h} className="badge bg-brand/15 text-brand"><Clock size={11} /> {h}</span>)}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">{w.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Dica: publique orgânico nessas janelas e concentre os lances pagos nos horários que mais convertem no seu mapa de calor (Dashboard).</p>
        </div>

        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><Sparkles size={18} className="text-brand" /> Analisar meu vídeo antes de postar</h3>
          <label className="label">Descreva o vídeo (tema, gancho, formato)</label>
          <textarea className="input min-h-24" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex.: vídeo mostrando antes/depois de um produto de skincare, começa com a pessoa reclamando da pele..." />
          <button className="btn-primary mt-3 w-full" onClick={analyze} disabled={loading || desc.length < 8}>
            {loading ? "Analisando..." : "Analisar com IA"}
          </button>

          {analysis && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-surface2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Veredito honesto</span>
                  <span className={`badge ${analysis.score >= 65 ? "bg-good/15 text-good" : "bg-warn/15 text-warn"}`}>Nota {analysis.score}/100</span>
                </div>
                <p className="mt-1 text-sm text-muted">{analysis.verdict}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold">3 ganchos sugeridos</p>
                <ul className="space-y-1 text-sm text-muted">{analysis.hooks.map((h, i) => <li key={i}>• {h}</li>)}</ul>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Plano por rede</p>
                {analysis.plans.map((p) => (
                  <div key={p.network} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">{p.network} — {p.title}</p>
                    <p className="mt-1 text-xs text-muted">Hashtags: {p.hashtags.join(" ")}</p>
                    <p className="text-xs text-muted">Horário: {p.bestTime} • Formato: {p.format}</p>
                    <p className="mt-1 text-xs text-brand">💰 Tráfego pago: {p.paidTip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
