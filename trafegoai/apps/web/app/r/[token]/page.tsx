"use client";
import { use } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Printer, TrendingUp } from "lucide-react";
import { Loading, ErrorState, useFetch, KpiCard } from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL, formatCompact } from "@/lib/metrics";

// Dashboard compartilhável por link (somente leitura) + export PDF (impressão).
export default function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, loading, error, reload } = useFetch<any>(() => api.get(`/reports/${token}`), [token]);

  if (loading) return <div className="mx-auto max-w-4xl p-8"><Loading /></div>;
  if (error) return <div className="mx-auto max-w-4xl p-8"><ErrorState error={error} onRetry={reload} /></div>;

  const { report, client, dashboard } = data;
  const k = dashboard.summary.current;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <header className="mb-6 flex items-center justify-between border-b pb-5" style={{ borderColor: client.logoColor }}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: client.logoColor }}><TrendingUp size={20} /></span>
          <div>
            <h1 className="font-display text-2xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted">{report.name}</p>
          </div>
        </div>
        <button className="btn-ghost no-print" onClick={() => window.print()}><Printer size={15} /> Baixar PDF</button>
      </header>

      <p className="mb-4 text-sm text-muted">Relatório somente leitura • gerado por TrafegoAI • últimos 30 dias</p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Investimento" value={formatBRL(k.spend)} delta={dashboard.summary.deltas.spend} invert />
        <KpiCard label="Receita" value={formatBRL(k.revenue)} delta={dashboard.summary.deltas.revenue} />
        <KpiCard label="ROAS" value={`${k.roas}x`} delta={dashboard.summary.deltas.roas} />
        <KpiCard label="Conversões" value={formatCompact(k.conversions)} delta={dashboard.summary.deltas.conversions} />
      </div>

      <div className="card">
        <h3 className="mb-3 font-display font-semibold">Investimento por plataforma</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dashboard.split}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
            <XAxis dataKey="platform" tick={{ fontSize: 12, fill: "rgb(var(--muted))" }} />
            <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} tickFormatter={(v) => formatCompact(v)} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="spend" name="Gasto" fill="#7c5cff" radius={[6, 6, 0, 0]} />
            <Bar dataKey="revenue" name="Receita" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <footer className="mt-8 text-center text-xs text-muted">Powered by TrafegoAI</footer>
    </div>
  );
}
