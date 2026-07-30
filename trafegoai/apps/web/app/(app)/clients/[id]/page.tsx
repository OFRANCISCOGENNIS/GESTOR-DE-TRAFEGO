"use client";
import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Mail, Phone, Tag, CalendarDays, CheckCircle2, Circle,
  ArrowRight, Sparkles, PlugZap, Target,
} from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, KpiCard, StatusBadge, PlatformBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL, formatCompact } from "@/lib/metrics";
import type { ClientProfile } from "@/lib/types";

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useFetch<ClientProfile>(() => api.get(`/clients/${id}/profile`), [id]);

  return (
    <div>
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft size={15} /> Voltar para clientes
      </Link>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <div className="space-y-5">
          {/* Cabeçalho do perfil */}
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: data.client.logoColor }}>
                <Users size={24} />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold">{data.client.name}</h1>
                <p className="text-sm text-muted">{data.contact.segment} • cliente desde {data.contact.since}</p>
              </div>
            </div>
            <HealthBadge score={data.health.score} label={data.health.label} />
          </div>

          {/* Contato do responsável */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoLine icon={Users} label="Responsável" value={data.contact.owner} />
            <InfoLine icon={Mail} label="E-mail" value={data.contact.email} />
            <InfoLine icon={Phone} label="Telefone" value={data.contact.phone} />
            <InfoLine icon={Tag} label="Segmento" value={data.contact.segment} />
          </div>

          {/* KPIs do perfil (últimos 30 dias) */}
          <div>
            <h2 className="mb-2 font-display font-semibold">Desempenho do perfil — últimos 30 dias</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <KpiCard label="Investimento" value={formatBRL(data.kpi.spend)} />
              <KpiCard label="Receita" value={formatBRL(data.kpi.revenue)} />
              <KpiCard label="ROAS" value={`${data.kpi.roas}x`} />
              <KpiCard label="CPA" value={formatBRL(data.kpi.cpa)} />
              <KpiCard label="CTR" value={`${data.kpi.ctr}%`} />
              <KpiCard label="Conversões" value={formatCompact(data.kpi.conversions)} />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Guia de gestão do perfil */}
            <div className="lg:col-span-2">
              <h2 className="mb-2 font-display font-semibold">Como gerenciar este perfil</h2>
              <p className="mb-3 text-sm text-muted">Um passo a passo do que revisar e ajustar para este cliente. {data.guide.filter((s) => s.done).length}/{data.guide.length} concluídos.</p>
              <div className="space-y-2">
                {data.guide.map((step, i) => (
                  <div key={step.id} className="card flex items-start gap-3 p-4">
                    <span className="mt-0.5 shrink-0">
                      {step.done ? <CheckCircle2 size={20} className="text-good" /> : <Circle size={20} className="text-muted" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium"><span className="text-muted">{i + 1}.</span> {step.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{step.description}</p>
                    </div>
                    <Link href={step.href} className="btn-ghost shrink-0 !py-1.5 text-xs">
                      {step.cta} <ArrowRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna lateral: contas, metas, atalhos */}
            <div className="space-y-5">
              <div className="card">
                <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><PlugZap size={16} className="text-brand" /> Contas conectadas</h3>
                {data.connections.length === 0 && <p className="text-sm text-muted">Nenhuma conta vinculada.</p>}
                <div className="space-y-2">
                  {data.connections.map((cn) => (
                    <div key={cn.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface2 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{cn.accountName}</p>
                        <div className="mt-1 flex items-center gap-1.5"><PlatformBadge platform={cn.platform} /><StatusBadge status={cn.status} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><Target size={16} className="text-brand" /> Metas</h3>
                {data.goals.length === 0 && <p className="text-sm text-muted">Sem metas definidas.</p>}
                <div className="space-y-2">
                  {data.goals.map((g) => (
                    <div key={g.id} className="rounded-xl bg-surface2 p-2.5 text-sm">
                      <p className="font-medium">{g.label}</p>
                      <p className="text-xs text-muted">Atual {g.metric === "roas" ? `${g.current}x` : formatBRL(g.current)} • meta {g.metric === "roas" ? `${g.target}x` : formatBRL(g.target)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card border-brand/30 bg-brand/5">
                <h3 className="flex items-center gap-2 font-display font-semibold"><Sparkles size={16} className="text-brand" /> Ações rápidas</h3>
                <div className="mt-3 grid gap-2">
                  <Link href="/recommendations" className="btn-primary w-full">Ver diagnóstico da IA</Link>
                  <Link href="/campaigns" className="btn-ghost w-full">Gerenciar campanhas</Link>
                  <Link href="/reports" className="btn-ghost w-full">Gerar relatório</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface2"><Icon size={15} className="text-brand" /></span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function HealthBadge({ score, label }: { score: number; label: string }) {
  const cls = score >= 80 ? "text-good" : score >= 50 ? "text-warn" : "text-bad";
  const ring = score >= 80 ? "border-good/40 bg-good/10" : score >= 50 ? "border-warn/40 bg-warn/10" : "border-bad/40 bg-bad/10";
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${ring}`}>
      <span className={`font-display text-2xl font-bold ${cls}`}>{score}%</span>
      <div>
        <p className="text-xs text-muted">Saúde do perfil</p>
        <p className={`text-sm font-semibold ${cls}`}>{label}</p>
      </div>
    </div>
  );
}
