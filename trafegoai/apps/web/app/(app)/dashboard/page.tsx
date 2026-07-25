"use client";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, FunnelChart, Funnel, LabelList,
} from "recharts";
import { Trophy, TriangleAlert, Flame, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { KpiCard, Loading, ErrorState, useFetch } from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL, formatCompact, formatNumber } from "@/lib/metrics";
import type { DashboardSummary, TimePoint, FunnelStep, PlatformSplit, HeatCell, Highlight } from "@/lib/types";

interface DashData {
  summary: DashboardSummary;
  timeseries: TimePoint[];
  funnel: FunnelStep[];
  split: PlatformSplit[];
  heatmap: HeatCell[];
  highlights: Highlight[];
}

const PERIODS = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];
const PLAT_COLORS: Record<string, string> = { google: "#4285F4", meta: "#3b82f6", tiktok: "#2dd4bf" };
const HIGHLIGHT_META = {
  best: { icon: Trophy, cls: "text-good" },
  worst: { icon: TriangleAlert, cls: "text-bad" },
  waste: { icon: Flame, cls: "text-warn" },
  opportunity: { icon: Lightbulb, cls: "text-brand" },
};
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");
  const { data, loading, error, reload } = useFetch<DashData>(() => api.get(`/dashboard?period=${period}`), [period]);

  return (
    <div>
      <PageHeader
        title="Dashboard unificado"
        subtitle="Google + Meta + TikTok consolidados, com comparação vs. período anterior."
        action={
          <div className="flex gap-1 rounded-xl bg-surface2 p-1">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${period === p.id ? "bg-brand text-white" : "text-muted hover:text-fg"}`}>
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="space-y-5">
          <AlertsRow anomalyLikely={data.summary.deltas.conversions < -20} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <KpiCard label="Investimento" value={formatBRL(data.summary.current.spend)} delta={data.summary.deltas.spend} invert />
            <KpiCard label="Receita" value={formatBRL(data.summary.current.revenue)} delta={data.summary.deltas.revenue} />
            <KpiCard label="ROAS" value={`${data.summary.current.roas}x`} delta={data.summary.deltas.roas} />
            <KpiCard label="ROI" value={`${data.summary.current.roi}%`} delta={data.summary.deltas.roi} />
            <KpiCard label="CPA" value={formatBRL(data.summary.current.cpa)} delta={data.summary.deltas.cpa} invert />
            <KpiCard label="CPC" value={formatBRL(data.summary.current.cpc)} delta={data.summary.deltas.cpc} invert />
            <KpiCard label="CPM" value={formatBRL(data.summary.current.cpm)} delta={data.summary.deltas.cpm} invert />
            <KpiCard label="CTR" value={`${data.summary.current.ctr}%`} delta={data.summary.deltas.ctr} />
            <KpiCard label="Tx. conversão" value={`${data.summary.current.convRate}%`} delta={data.summary.deltas.convRate} />
            <KpiCard label="Impressões" value={formatCompact(data.summary.current.impressions)} delta={data.summary.deltas.impressions} />
            <KpiCard label="Cliques" value={formatCompact(data.summary.current.clicks)} delta={data.summary.deltas.clicks} />
            <KpiCard label="Conversões" value={formatNumber(data.summary.current.conversions)} delta={data.summary.deltas.conversions} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h3 className="mb-3 font-display font-semibold">Evolução: gasto × receita</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.timeseries}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="#7c5cff" fill="url(#gRev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="spend" name="Gasto" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="mb-3 font-display font-semibold">Verba por plataforma</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.split} dataKey="spend" nameKey="platform" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {data.split.map((s) => <Cell key={s.platform} fill={PLAT_COLORS[s.platform]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4 text-xs">
                {data.split.map((s) => (
                  <span key={s.platform} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLAT_COLORS[s.platform] }} />
                    {s.platform}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-display font-semibold">Funil: impressão → clique → conversão</h3>
              <ResponsiveContainer width="100%" height={240}>
                <FunnelChart>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Funnel dataKey="value" data={data.funnel} isAnimationActive>
                    <LabelList position="right" fill="rgb(var(--fg))" dataKey="step" />
                    {data.funnel.map((_, i) => <Cell key={i} fill={["#7c5cff", "#3b82f6", "#22c55e"][i]} />)}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="mb-3 font-display font-semibold">Mapa de calor — conversões por horário/dia</h3>
              <Heatmap cells={data.heatmap} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.highlights.map((h) => {
              const meta = HIGHLIGHT_META[h.kind];
              const Icon = meta.icon;
              return (
                <div key={h.kind} className="card">
                  <div className={`mb-2 flex items-center gap-2 ${meta.cls}`}>
                    <Icon size={18} /> <span className="text-sm font-semibold">{h.title}</span>
                  </div>
                  <p className="text-sm text-muted">{h.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "rgb(var(--surface2))", border: "1px solid rgb(var(--border))",
  borderRadius: 12, color: "rgb(var(--fg))", fontSize: 12,
};

function AlertsRow({ anomalyLikely }: { anomalyLikely: boolean }) {
  if (!anomalyLikely) return null;
  return (
    <div className="card flex items-center gap-3 border-warn/40 bg-warn/10">
      <TriangleAlert className="text-warn" size={20} />
      <p className="text-sm">Alerta: uma métrica-chave saiu do padrão (queda de conversões). Veja detalhes em Recomendações IA.</p>
    </div>
  );
}

function Heatmap({ cells }: { cells: HeatCell[] }) {
  const max = Math.max(...cells.map((c) => c.value), 1);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="flex">
          <div className="w-10" />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-muted">{h % 3 === 0 ? `${h}h` : ""}</div>
          ))}
        </div>
        {DAYS.map((day, d) => (
          <div key={d} className="flex items-center">
            <div className="w-10 text-xs text-muted">{day}</div>
            {Array.from({ length: 24 }).map((_, h) => {
              const cell = cells.find((c) => c.day === d && c.hour === h);
              const intensity = cell ? cell.value / max : 0;
              return (
                <div key={h} className="m-[1px] flex-1 rounded-sm"
                  title={`${day} ${h}h — ${cell?.value ?? 0} conv.`}
                  style={{ aspectRatio: "1", background: `rgba(124,92,255,${0.08 + intensity * 0.85})` }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
