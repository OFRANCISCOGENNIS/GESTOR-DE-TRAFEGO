// Cálculo de métricas derivadas a partir do schema comum MetricDaily.
// Funções puras — cobertas por testes no backend (apps/api).
import type { Kpi } from "./types";

export interface MetricDaily {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  frequency?: number;
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function deriveKpi(m: MetricDaily): Kpi {
  const roas = safeDiv(m.revenue, m.spend);
  return {
    spend: round(m.spend),
    revenue: round(m.revenue),
    roas: round(roas, 2),
    roi: round((roas - 1) * 100, 1),
    cpa: round(safeDiv(m.spend, m.conversions), 2),
    cpc: round(safeDiv(m.spend, m.clicks), 2),
    cpm: round(safeDiv(m.spend, m.impressions) * 1000, 2),
    ctr: round(safeDiv(m.clicks, m.impressions) * 100, 2),
    convRate: round(safeDiv(m.conversions, m.clicks) * 100, 2),
    impressions: Math.round(m.impressions),
    clicks: Math.round(m.clicks),
    conversions: Math.round(m.conversions),
  };
}

export function sumMetrics(items: MetricDaily[]): MetricDaily {
  return items.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      revenue: acc.revenue + m.revenue,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
    }),
    { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
  );
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round(((current - previous) / previous) * 100, 1);
}

export function round(n: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(n);
}
