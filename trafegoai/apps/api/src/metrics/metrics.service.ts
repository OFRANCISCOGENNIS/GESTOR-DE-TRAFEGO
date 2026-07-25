import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { deriveKpi, sumMetrics, pctChange, MetricDaily } from "../common/metrics.util";

// Serviço de leitura: agrega MetricDaily e devolve KPIs derivados.
@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  days(period: string): number {
    if (period === "today") return 1;
    if (period === "7d") return 7;
    return 30;
  }

  private async campaignSeries(days: number, offset = 0): Promise<MetricDaily[]> {
    const since = new Date(Date.now() - (days + offset) * 86400000);
    const until = new Date(Date.now() - offset * 86400000);
    const rows = await this.prisma.metricDaily.findMany({
      where: { level: "campaign", date: { gte: since, lt: until } },
    });
    return rows.map((r) => ({
      spend: r.spend, revenue: r.revenue, impressions: r.impressions,
      clicks: r.clicks, conversions: r.conversions, frequency: r.frequency,
    }));
  }

  async summary(period: string) {
    const days = this.days(period);
    const cur = sumMetrics(await this.campaignSeries(days));
    const prev = sumMetrics(await this.campaignSeries(days, days));
    const curK = deriveKpi(cur);
    const prevK = deriveKpi(prev);
    const deltas: Record<string, number> = {};
    Object.keys(curK).forEach((k) => (deltas[k] = pctChange((curK as any)[k], (prevK as any)[k])));
    return { current: curK, deltas };
  }
}
