// ────────────────────────────────────────────────────────────────────────────
// Conectores de plataforma + CAMADA DE NORMALIZAÇÃO.
// Cada conector converte o formato NATIVO de cada API para o schema comum
// `MetricDaily`. ROAS/CPA/etc. são derivados na leitura (common/metrics.util).
//
// PONTOS DE INTEGRAÇÃO (o app roda com mock enquanto o acesso às APIs não é
// liberado). Respeite rate limits e faça cache das leituras.
// ────────────────────────────────────────────────────────────────────────────
import type { MetricDaily } from "../common/metrics.util";

export interface NormalizedRow extends MetricDaily {
  date: string;
  externalCampaignId: string;
}

export interface PlatformConnector {
  platform: "google" | "meta" | "tiktok";
  // Autenticação OAuth oficial. Ver connections module para connect/callback.
  fetchDailyMetrics(accountId: string, since: string, until: string): Promise<NormalizedRow[]>;
  // Escrita real (pausar/verba). Exige confirmação + auditoria na camada acima.
  pauseCampaign(externalId: string): Promise<void>;
  setBudget(externalId: string, dailyBudget: number): Promise<void>;
}

// Google Ads API — https://developers.google.com/google-ads/api
export class GoogleAdsConnector implements PlatformConnector {
  platform = "google" as const;
  async fetchDailyMetrics(): Promise<NormalizedRow[]> {
    // TODO(integração): GAQL SELECT metrics.cost_micros, metrics.conversions_value...
    // Normalização: spend = cost_micros / 1e6; revenue = conversions_value; etc.
    return [];
  }
  async pauseCampaign(): Promise<void> {/* MutateCampaigns status=PAUSED */}
  async setBudget(): Promise<void> {/* MutateCampaignBudgets amount_micros */}
}

// Meta Marketing API — https://developers.facebook.com/docs/marketing-apis
export class MetaAdsConnector implements PlatformConnector {
  platform = "meta" as const;
  async fetchDailyMetrics(): Promise<NormalizedRow[]> {
    // TODO(integração): GET /insights fields=spend,action_values,impressions,clicks
    // Normalização: revenue = action_values(purchase); frequency do próprio insights.
    return [];
  }
  async pauseCampaign(): Promise<void> {/* POST {campaign-id} status=PAUSED */}
  async setBudget(): Promise<void> {/* POST daily_budget (centavos) */}
}

// TikTok Marketing API — https://business-api.tiktok.com/portal/docs
export class TikTokAdsConnector implements PlatformConnector {
  platform = "tiktok" as const;
  async fetchDailyMetrics(): Promise<NormalizedRow[]> {
    // TODO(integração): /report/integrated/get com dimensions=campaign_id,stat_time_day
    // Normalização: spend, total_complete_payment_rate -> conversions/revenue.
    return [];
  }
  async pauseCampaign(): Promise<void> {/* /campaign/status/update operation_status=DISABLE */}
  async setBudget(): Promise<void> {/* /campaign/update budget */}
}

export const CONNECTORS: Record<string, PlatformConnector> = {
  google: new GoogleAdsConnector(),
  meta: new MetaAdsConnector(),
  tiktok: new TikTokAdsConnector(),
};
