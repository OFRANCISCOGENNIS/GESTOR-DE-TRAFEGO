"use client";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, Flame, Eye, Globe } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch } from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL, formatCompact } from "@/lib/metrics";
import type { Product, TrendingVideo } from "@/lib/types";

export default function RadarPage() {
  const [tab, setTab] = useState<"products" | "videos">("products");
  return (
    <div>
      <PageHeader title="Radar de Tendências" subtitle="A máquina de inteligência: o que está vendendo e o que está viralizando no mundo." />
      <div className="mb-5 flex gap-2 rounded-xl bg-surface2 p-1 md:w-96">
        {(["products", "videos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${tab === t ? "bg-brand text-white" : "text-muted"}`}>
            {t === "products" ? "Produtos em alta" : "Vídeos em alta"}
          </button>
        ))}
      </div>
      {tab === "products" ? <Products /> : <Videos />}
    </div>
  );
}

function Products() {
  const { data, loading, error, reload } = useFetch<Product[]>(() => api.get("/radar/products"));
  const [country, setCountry] = useState("all");
  const [market, setMarket] = useState("all");
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  let rows = data ?? [];
  if (country !== "all") rows = rows.filter((p) => p.country === country);
  if (market !== "all") rows = rows.filter((p) => p.marketplace === market);
  rows = [...rows].sort((a, b) => b.demandScore - a.demandScore);
  const countries = Array.from(new Set(data?.map((p) => p.country)));
  const markets = Array.from(new Set(data?.map((p) => p.marketplace)));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="input md:w-44" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="País">
          <option value="all">Todos os países</option>{countries.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input md:w-52" value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Marketplace">
          <option value="all">Todos os marketplaces</option>{markets.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-semibold">{p.name}</h3>
                <p className="text-xs text-muted">{p.category} • {p.marketplace} • {p.country}</p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 font-display text-lg font-bold text-brand">{p.demandScore}</span>
            </div>
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={p.trend.map((v, i) => ({ i, v }))}>
                  <Line type="monotone" dataKey="v" stroke="#7c5cff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-muted">Crescimento 7d</p><p className="font-semibold text-good">+{p.growth7d}%</p></div>
              <div><p className="text-muted">Faixa preço</p><p className="font-semibold">{formatBRL(p.priceMin)}–{formatBRL(p.priceMax)}</p></div>
              <div><p className="text-muted">Concorrência</p><p className="font-semibold capitalize">{p.competition}</p></div>
            </div>
            <p className="mt-3 rounded-xl bg-surface2 p-3 text-sm"><Flame size={14} className="mr-1 inline text-warn" /> {p.insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Videos() {
  const { data, loading, error, reload } = useFetch<TrendingVideo[]>(() => api.get("/radar/videos"));
  const [network, setNetwork] = useState("all");
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  let rows = data ?? [];
  if (network !== "all") rows = rows.filter((v) => v.network === network);
  const networks = Array.from(new Set(data?.map((v) => v.network)));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="input md:w-44" value={network} onChange={(e) => setNetwork(e.target.value)} aria-label="Rede">
          <option value="all">Todas as redes</option>{networks.map((n) => <option key={n}>{n}</option>)}
        </select>
        <p className="flex items-center gap-1 text-xs text-muted"><Globe size={13} /> YouTube "Em alta" via YouTube Data API v3 quando há YOUTUBE_API_KEY.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((v) => (
          <div key={v.id} className="card">
            <div className="flex items-center justify-between">
              <span className="badge bg-brand/15 text-brand">{v.network}</span>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1"><Eye size={12} /> {formatCompact(v.views)}</span>
                <span className="flex items-center gap-1 text-good"><TrendingUp size={12} /> +{v.growth24h}% 24h</span>
                {v.real && <span className="badge bg-good/15 text-good">Real</span>}
              </div>
            </div>
            <h3 className="mt-2 font-display font-semibold">{v.title}</h3>
            <p className="text-xs text-muted">{v.format} • {v.country}</p>
            <p className="mt-2 text-sm"><b className="text-muted">Gancho (3s):</b> {v.hook}</p>
            <p className="mt-1 text-sm"><b className="text-muted">Por que funciona:</b> {v.whyItWorks}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
