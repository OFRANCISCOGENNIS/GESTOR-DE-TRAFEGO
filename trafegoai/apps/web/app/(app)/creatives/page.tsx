"use client";
import { useState } from "react";
import { Images, Sparkles, Copy } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, PlatformBadge, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import type { Ad, Platform } from "@/lib/types";

export default function CreativesPage() {
  const { data, loading, error, reload } = useFetch<Ad[]>(() => api.get("/insights/creatives"));
  const { show, node } = useToast();
  return (
    <div>
      <PageHeader title="Criativos" subtitle="Ranking por desempenho, detecção de fadiga, comparação e gerador com IA." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-2 font-display font-semibold">Ranking de anúncios</h3>
          {loading && <Loading />}
          {error && <ErrorState error={error} onRetry={reload} />}
          <div className="grid gap-2 sm:grid-cols-2">
            {data?.map((ad, i) => (
              <div key={ad.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{ad.thumbnail}</span>
                  <div className="flex-1">
                    <p className="font-medium">#{i + 1} {ad.name}</p>
                    <p className="text-xs text-muted">ROAS {ad.kpi.roas}x • CTR {ad.kpi.ctr}% • freq. {ad.frequency}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs"><span className="text-muted">Fadiga</span><span className={ad.fatigueScore > 60 ? "text-bad" : "text-good"}>{ad.fatigueScore}/100</span></div>
                  <div className="h-2 rounded-full bg-surface2"><div className={`h-2 rounded-full ${ad.fatigueScore > 60 ? "bg-bad" : "bg-good"}`} style={{ width: `${ad.fatigueScore}%` }} /></div>
                  {ad.fatigueScore > 60 && <p className="mt-1 text-xs text-bad">Criativo cansado: CTR em queda + frequência alta. Troque em breve.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Generator onGenerated={() => show("Criativos gerados pela IA.")} showToast={show} />
      </div>
      {node}
    </div>
  );
}

function Generator({ onGenerated, showToast }: { onGenerated: () => void; showToast: (m: string) => void }) {
  const [product, setProduct] = useState("");
  const [platform, setPlatform] = useState<Platform>("meta");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const gen = async () => {
    setLoading(true);
    try { const r = await api.post("/creatives/generate", { product, platform }); setResult(r); onGenerated(); }
    finally { setLoading(false); }
  };
  const copy = (t: string) => { navigator.clipboard?.writeText(t); showToast("Copiado."); };
  return (
    <div className="card h-fit">
      <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><Sparkles size={18} className="text-brand" /> Gerador de criativos IA</h3>
      <label className="label">Produto / oferta</label>
      <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ex.: suplemento de colágeno" />
      <label className="label mt-3">Plataforma</label>
      <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
        <option value="meta">Meta</option><option value="google">Google</option><option value="tiktok">TikTok</option>
      </select>
      <button className="btn-primary mt-3 w-full" onClick={gen} disabled={loading || !product}>{loading ? "Gerando..." : "Gerar criativos"}</button>
      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <Block title="Headlines" items={result.headlines} onCopy={copy} />
          <Block title="Textos primários" items={result.primaryTexts} onCopy={copy} />
          <Block title="Descrições" items={result.descriptions} onCopy={copy} />
          <Block title="CTAs" items={result.ctas} onCopy={copy} />
          <Block title="Ângulos" items={result.angles} onCopy={copy} />
        </div>
      )}
    </div>
  );
}

function Block({ title, items, onCopy }: { title: string; items: string[]; onCopy: (t: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-muted">{title}</p>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-surface2 p-2">
            <span>{it}</span>
            <button onClick={() => onCopy(it)} className="shrink-0 text-muted hover:text-fg" aria-label="Copiar"><Copy size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
