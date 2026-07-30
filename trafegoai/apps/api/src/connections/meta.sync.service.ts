// Sincronização das métricas da Meta para o banco, no schema comum MetricDaily.
// Faz upsert por (campanha, dia) para poder rodar quantas vezes quiser sem duplicar.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MetaConnector, MetaApiError } from '../connectors/meta.connector';
import { decryptToken } from '../common/crypto.util';

export interface SyncResult {
  connectionId: string;
  accountName: string;
  days: number;
  campaigns: number;
  rows: number;
  spend: number;
  revenue: number;
}

@Injectable()
export class MetaSyncService {
  private readonly logger = new Logger(MetaSyncService.name);
  constructor(private prisma: PrismaService, private meta: MetaConnector) {}

  private isoDaysAgo(n: number): string {
    return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  }

  /** Puxa os últimos `days` dias de uma conexão e grava no banco. */
  async syncConnection(connectionId: string, days = 30): Promise<SyncResult> {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn) throw new Error('Conexão não encontrada');
    if (!conn.accessToken) throw new Error('Conexão sem token — refaça a autorização');
    if (!conn.externalAccountId) throw new Error('Conexão sem conta de anúncios selecionada');

    const token = decryptToken(conn.accessToken);
    const since = this.isoDaysAgo(days);
    const until = this.isoDaysAgo(0);

    let rows;
    try {
      rows = await this.meta.fetchDailyMetrics(token, conn.externalAccountId, since, until);
    } catch (e) {
      const err = e as MetaApiError;
      await this.prisma.connection.update({
        where: { id: conn.id },
        data: { status: err.needsReauth ? 'expired' : 'error' },
      });
      throw e;
    }

    let spend = 0;
    let revenue = 0;
    const campaignIds = new Set<string>();

    for (const r of rows) {
      if (!r.externalCampaignId) continue;
      campaignIds.add(r.externalCampaignId);

      // garante a campanha no banco (nome vem junto do insight)
      const campaign = await this.prisma.campaign.upsert({
        where: { externalId_platform: { externalId: r.externalCampaignId, platform: 'meta' } },
        update: { name: r.campaignName || 'Campanha sem nome' },
        create: {
          externalId: r.externalCampaignId,
          name: r.campaignName || 'Campanha sem nome',
          platform: 'meta',
          clientId: conn.clientId,
        },
      });

      const date = new Date(r.date + 'T00:00:00.000Z');
      await this.prisma.metricDaily.upsert({
        where: { campaignId_date_level: { campaignId: campaign.id, date, level: 'campaign' } },
        update: {
          spend: r.spend, revenue: r.revenue, impressions: r.impressions,
          clicks: r.clicks, conversions: r.conversions, frequency: r.frequency,
        },
        create: {
          date, level: 'campaign', campaignId: campaign.id,
          spend: r.spend, revenue: r.revenue, impressions: r.impressions,
          clicks: r.clicks, conversions: r.conversions, frequency: r.frequency,
        },
      });

      spend += r.spend;
      revenue += r.revenue;
    }

    await this.prisma.connection.update({
      where: { id: conn.id },
      data: { status: 'active', lastSync: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'Sincronizou métricas da Meta',
        target: `${conn.accountName} — ${rows.length} registro(s)`,
        user: 'sistema',
      },
    });

    this.logger.log(`Sincronizada ${conn.accountName}: ${rows.length} linhas, ${campaignIds.size} campanhas`);
    return {
      connectionId: conn.id,
      accountName: conn.accountName,
      days,
      campaigns: campaignIds.size,
      rows: rows.length,
      spend: Math.round(spend * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
    };
  }

  /** Sincroniza todas as conexões Meta ativas (usado pelo worker agendado). */
  async syncAll(days = 7): Promise<SyncResult[]> {
    const conns = await this.prisma.connection.findMany({
      where: { platform: 'meta', status: { in: ['active', 'error'] } },
    });
    const out: SyncResult[] = [];
    for (const c of conns) {
      try {
        out.push(await this.syncConnection(c.id, days));
      } catch (e) {
        this.logger.warn(`Falha ao sincronizar ${c.accountName}: ${(e as Error).message}`);
      }
    }
    return out;
  }
}
