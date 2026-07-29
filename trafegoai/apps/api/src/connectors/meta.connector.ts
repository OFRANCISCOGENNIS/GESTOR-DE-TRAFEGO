// Conector real da Meta Marketing API (Facebook e Instagram Ads).
//
// Ativa quando META_APP_ID e META_APP_SECRET estão definidos. Sem as chaves,
// `isConfigured` devolve false e a API responde orientando o cadastro do app —
// nada é inventado.
//
// Documentação: https://developers.facebook.com/docs/marketing-apis
import { Injectable, Logger } from '@nestjs/common';
import { normalizeMetaInsights, NormalizedRow, MetaInsightRow } from './meta.normalize';

const GRAPH = 'https://graph.facebook.com';
const VERSION = process.env.META_API_VERSION || 'v21.0';

// Permissões mínimas: ler campanhas e métricas. `ads_management` só é preciso
// para escrever (pausar, mudar verba) — mantido fora por enquanto.
const SCOPES = ['ads_read', 'business_management'];

export interface MetaAdAccount {
  id: string; // formato act_<numero>
  name: string;
  accountStatus: number;
  currency?: string;
}

export interface TokenResult {
  accessToken: string;
  expiresInSeconds: number | null;
}

@Injectable()
export class MetaConnector {
  private readonly logger = new Logger(MetaConnector.name);
  readonly platform = 'meta' as const;

  get appId(): string | undefined {
    return process.env.META_APP_ID;
  }
  private get appSecret(): string | undefined {
    return process.env.META_APP_SECRET;
  }
  get isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }
  private get redirectUri(): string {
    return process.env.META_REDIRECT_URI || `${process.env.API_URL || 'http://localhost:3333'}/connections/meta/callback`;
  }

  /** URL para onde o usuário é enviado para autorizar o acesso às contas dele. */
  buildAuthUrl(state: string): string {
    const u = new URL(`https://www.facebook.com/${VERSION}/dialog/oauth`);
    u.searchParams.set('client_id', this.appId!);
    u.searchParams.set('redirect_uri', this.redirectUri);
    u.searchParams.set('scope', SCOPES.join(','));
    u.searchParams.set('state', state);
    u.searchParams.set('response_type', 'code');
    return u.toString();
  }

  /** Troca o código do callback por um token de curta duração. */
  async exchangeCode(code: string): Promise<TokenResult> {
    const u = new URL(`${GRAPH}/${VERSION}/oauth/access_token`);
    u.searchParams.set('client_id', this.appId!);
    u.searchParams.set('client_secret', this.appSecret!);
    u.searchParams.set('redirect_uri', this.redirectUri);
    u.searchParams.set('code', code);
    const json = await this.getJson(u.toString());
    return { accessToken: json.access_token, expiresInSeconds: json.expires_in ?? null };
  }

  /** Converte para token de longa duração (cerca de 60 dias). */
  async exchangeForLongLived(shortToken: string): Promise<TokenResult> {
    const u = new URL(`${GRAPH}/${VERSION}/oauth/access_token`);
    u.searchParams.set('grant_type', 'fb_exchange_token');
    u.searchParams.set('client_id', this.appId!);
    u.searchParams.set('client_secret', this.appSecret!);
    u.searchParams.set('fb_exchange_token', shortToken);
    const json = await this.getJson(u.toString());
    return { accessToken: json.access_token, expiresInSeconds: json.expires_in ?? null };
  }

  /** Contas de anúncios que o usuário autorizado administra. */
  async listAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    const u = new URL(`${GRAPH}/${VERSION}/me/adaccounts`);
    u.searchParams.set('fields', 'id,name,account_status,currency');
    u.searchParams.set('limit', '100');
    u.searchParams.set('access_token', accessToken);
    const json = await this.getJson(u.toString());
    return (json.data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      accountStatus: a.account_status,
      currency: a.currency,
    }));
  }

  /**
   * Métricas diárias por campanha, já normalizadas para o schema comum.
   * `since` e `until` no formato YYYY-MM-DD.
   */
  async fetchDailyMetrics(
    accessToken: string,
    adAccountId: string,
    since: string,
    until: string,
  ): Promise<NormalizedRow[]> {
    const fields = [
      'campaign_id', 'campaign_name', 'spend', 'impressions',
      'clicks', 'frequency', 'actions', 'action_values',
    ].join(',');
    let url: string | null = (() => {
      const u = new URL(`${GRAPH}/${VERSION}/${adAccountId}/insights`);
      u.searchParams.set('level', 'campaign');
      u.searchParams.set('time_increment', '1'); // uma linha por dia
      u.searchParams.set('fields', fields);
      u.searchParams.set('time_range', JSON.stringify({ since, until }));
      u.searchParams.set('limit', '500');
      u.searchParams.set('access_token', accessToken);
      return u.toString();
    })();

    const all: MetaInsightRow[] = [];
    let pages = 0;
    // Segue a paginação, com teto para não girar sem fim se a API repetir cursores.
    while (url && pages < 25) {
      const json: any = await this.getJson(url);
      if (Array.isArray(json.data)) all.push(...json.data);
      url = json.paging?.next || null;
      pages++;
    }
    return normalizeMetaInsights(all);
  }

  private async getJson(url: string): Promise<any> {
    const res = await fetch(url);
    const json = await res.json().catch(() => null);
    if (!res.ok || (json && json.error)) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      const code = json?.error?.code;
      this.logger.warn(`Meta API respondeu com erro${code ? ` (código ${code})` : ''}: ${msg}`);
      throw new MetaApiError(msg, code, json?.error?.type);
    }
    return json;
  }
}

export class MetaApiError extends Error {
  constructor(message: string, readonly code?: number, readonly type?: string) {
    super(message);
    this.name = 'MetaApiError';
  }
  /** Token expirado ou revogado: precisa reconectar a conta. */
  get needsReauth(): boolean {
    return this.code === 190 || this.type === 'OAuthException';
  }
}
