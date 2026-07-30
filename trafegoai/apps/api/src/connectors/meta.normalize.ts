// Normalização da Meta Marketing API para o schema comum `MetricDaily`.
// Função pura, sem rede — coberta por meta.normalize.spec.ts.
//
// A Meta devolve conversões e receita dentro de arrays (`actions` e
// `action_values`), com vários tipos de evento no mesmo array. Aqui escolhemos
// o evento de compra e evitamos contar o mesmo resultado duas vezes.

export interface MetaActionItem {
  action_type: string;
  value: string | number;
}

export interface MetaInsightRow {
  date_start: string;
  date_stop?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  ad_id?: string;
  spend?: string | number;
  impressions?: string | number;
  clicks?: string | number;
  frequency?: string | number;
  actions?: MetaActionItem[];
  action_values?: MetaActionItem[];
}

export interface NormalizedRow {
  date: string; // YYYY-MM-DD
  externalCampaignId: string | null;
  externalAdSetId: string | null;
  externalAdId: string | null;
  campaignName: string | null;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  frequency: number;
}

// Ordem de preferência para identificar uma compra. O primeiro tipo encontrado
// vence, para não somar o mesmo evento contado de formas diferentes pela Meta.
const PURCHASE_TYPES = [
  'omni_purchase',
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'onsite_web_purchase',
  'app_custom_event.fb_mobile_purchase',
];

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

// Pega o valor do primeiro tipo de compra presente na lista.
export function pickPurchase(items?: MetaActionItem[]): number {
  if (!items || !items.length) return 0;
  for (const type of PURCHASE_TYPES) {
    const found = items.find((i) => i.action_type === type);
    if (found) return num(found.value);
  }
  return 0;
}

export function normalizeMetaInsight(row: MetaInsightRow): NormalizedRow {
  return {
    date: row.date_start,
    externalCampaignId: row.campaign_id ?? null,
    externalAdSetId: row.adset_id ?? null,
    externalAdId: row.ad_id ?? null,
    campaignName: row.campaign_name ?? null,
    spend: round2(num(row.spend)),
    revenue: round2(pickPurchase(row.action_values)),
    impressions: Math.round(num(row.impressions)),
    clicks: Math.round(num(row.clicks)),
    conversions: Math.round(pickPurchase(row.actions)),
    frequency: round2(num(row.frequency)),
  };
}

export function normalizeMetaInsights(rows: MetaInsightRow[]): NormalizedRow[] {
  return (rows || []).filter((r) => r && r.date_start).map(normalizeMetaInsight);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
