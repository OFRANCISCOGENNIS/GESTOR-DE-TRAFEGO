// Métricas derivadas a partir do schema comum MetricDaily.
// Funções puras — cobertas por metrics.util.spec.ts.

export interface MetricDaily {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  frequency?: number;
}

export interface DerivedKpi {
  spend: number;
  revenue: number;
  roas: number;
  roi: number;
  cpa: number;
  cpc: number;
  cpm: number;
  ctr: number;
  convRate: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function round(n: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function deriveKpi(m: MetricDaily): DerivedKpi {
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
    { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 },
  );
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round(((current - previous) / previous) * 100, 1);
}

// Detecção de anomalias por z-score sobre uma série diária.
export function zScores(series: number[]): number[] {
  const n = series.length;
  if (n === 0) return [];
  const mean = series.reduce((a, b) => a + b, 0) / n;
  const variance = series.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  return series.map((v) => (std === 0 ? 0 : round((v - mean) / std, 2)));
}

export function detectAnomaly(series: number[], threshold = 2.5): { index: number; z: number } | null {
  const zs = zScores(series);
  const last = zs[zs.length - 1] ?? 0;
  if (Math.abs(last) >= threshold) return { index: zs.length - 1, z: last };
  return null;
}
