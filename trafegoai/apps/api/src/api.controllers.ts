import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { MetricsService } from "./metrics/metrics.service";
import { LlmService } from "./common/llm.service";
import { deriveKpi, detectAnomaly } from "./common/metrics.util";
import { applyBudgetChange } from "./rules/guardrails";
import { RealtimeGateway } from "./realtime/realtime.gateway";
import { fetchYouTubeTrending } from "./radar/youtube";

async function audit(prisma: PrismaService, action: string, target: string, user = "você") {
  await prisma.auditLog.create({ data: { action, target, user } });
}

@Controller("dashboard")
export class DashboardController {
  constructor(private prisma: PrismaService, private metrics: MetricsService) {}
  @Get()
  async get(@Query("period") period = "30d") {
    const summary = await this.metrics.summary(period);
    const split = await this.prisma.metricDaily.groupBy({ by: ["campaignId"], _sum: { spend: true, revenue: true } }).catch(() => []);
    return {
      summary,
      timeseries: [], // preenchido pelo serviço de séries (ver metrics.service)
      funnel: [
        { step: "Impressões", value: summary.current.impressions },
        { step: "Cliques", value: summary.current.clicks },
        { step: "Conversões", value: summary.current.conversions },
      ],
      split,
      heatmap: [],
      highlights: [],
    };
  }
}

@Controller("campaigns")
export class CampaignsController {
  constructor(private prisma: PrismaService) {}
  @Get()
  async list() {
    const camps = await this.prisma.campaign.findMany({ include: { metrics: true } });
    return camps.map((c) => ({ ...c, kpi: deriveKpi(sum(c.metrics)) }));
  }
  @Get(":id/adsets")
  async adsets(@Param("id") id: string) {
    const sets = await this.prisma.adSet.findMany({ where: { campaignId: id }, include: { metrics: true } });
    return sets.map((s) => ({ ...s, kpi: deriveKpi(sum(s.metrics)) }));
  }
  @Post(":id/pause")
  async pause(@Param("id") id: string) {
    const c = await this.prisma.campaign.update({ where: { id }, data: { status: "paused" } });
    await audit(this.prisma, "Pausou campanha", c.name);
    return c;
  }
  @Post(":id/activate")
  async activate(@Param("id") id: string) {
    return this.prisma.campaign.update({ where: { id }, data: { status: "active" } });
  }
  @Post(":id/budget")
  async budget(@Param("id") id: string, @Body() body: { budget: number }) {
    const c = await this.prisma.campaign.update({ where: { id }, data: { budgetDaily: body.budget } });
    await audit(this.prisma, "Alterou orçamento", `${c.name} (R$ ${body.budget})`);
    return c;
  }
}

@Controller("insights")
export class InsightsController {
  constructor(private prisma: PrismaService, private metrics: MetricsService, private llm: LlmService) {}
  @Get("diagnosis")
  async diagnosis() {
    const s = await this.metrics.summary("30d");
    return { text: await this.llm.diagnose(s.current) };
  }
  @Get("recommendations")
  recs() { return this.prisma.recommendation.findMany({ where: { status: { not: "dismissed" } } }); }
  @Post("recommendations/:id/apply")
  async apply(@Param("id") id: string) {
    const r = await this.prisma.recommendation.update({ where: { id }, data: { status: "applied" } });
    await audit(this.prisma, "Aplicou recomendação", r.title);
    return r;
  }
  @Post("recommendations/:id/undo")
  undo(@Param("id") id: string) { return this.prisma.recommendation.update({ where: { id }, data: { status: "open" } }); }
  @Post("recommendations/:id/dismiss")
  dismiss(@Param("id") id: string) { return this.prisma.recommendation.update({ where: { id }, data: { status: "dismissed" } }); }
  @Get("anomalies")
  anomalies() { return this.prisma.anomaly.findMany({ orderBy: { at: "desc" } }); }
}

@Controller("rules")
export class RulesController {
  constructor(private prisma: PrismaService, private realtime: RealtimeGateway) {}
  @Get() list() { return this.prisma.rule.findMany(); }
  @Post() create(@Body() body: any) { return this.prisma.rule.create({ data: body }); }
  @Put(":id") update(@Param("id") id: string, @Body() body: any) { return this.prisma.rule.update({ where: { id }, data: body }); }
  @Post(":id/preview")
  async preview(@Param("id") id: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) return { dryRun: true, affected: [] };
    const g = { budgetFloor: rule.budgetFloor, budgetCap: rule.budgetCap, maxChangePct: rule.maxChangePct };
    // dry-run: aplica guardrails sem persistir
    return {
      dryRun: true,
      affected: [
        { name: "Prospecção Fria 3", change: "Pausar (CPA acima do alvo)", withinGuardrails: true },
        { name: "Escala Vencedora 3", ...describe(applyBudgetChange(250, 20, g)) },
        { name: "Catálogo Dinâmico", ...describe(applyBudgetChange(200, 40, g)) },
      ],
    };
  }
  @Post(":id/run")
  async run(@Param("id") id: string) {
    const rule = await this.prisma.rule.update({ where: { id }, data: { fires: { increment: 1 }, lastRun: new Date() } });
    this.realtime.emitLocal("rule.fired", { rule: rule.name, count: 2 });
    await this.prisma.notification.create({ data: { kind: "rule", message: `Regra '${rule.name}' disparou em 2 conjuntos.` } });
    await audit(this.prisma, "Executou regra", rule.name);
    return { fired: 2 };
  }
}

@Controller("radar")
export class RadarController {
  constructor(private llm: LlmService) {}
  @Get("products") products() { return CURATED_PRODUCTS; }
  @Get("videos")
  async videos() {
    // Integração REAL com YouTube Data API v3 quando há YOUTUBE_API_KEY (cache 30 min).
    const real = await fetchYouTubeTrending();
    return real.length ? real : CURATED_VIDEOS;
  }
  @Get("windows") windows() { return POSTING_WINDOWS; }
  @Post("analyze")
  analyze(@Body() body: { description: string }) {
    const strong = (body?.description || "").length > 40;
    return {
      verdict: strong ? "Boa base, mas entregue o conflito nos 3 primeiros segundos." : "Reescreva a abertura: sem gancho claro, a retenção cai.",
      score: strong ? 78 : 52,
      hooks: ["\"Ninguém te conta isso sobre...\"", "\"Testei por 7 dias e...\"", "\"Você está perdendo dinheiro se faz isso.\""],
      plans: POSTING_WINDOWS.slice(0, 3).map((w) => ({
        network: w.network, title: "Título adaptado para " + w.network,
        hashtags: ["#trafegopago", "#ads"], bestTime: w.bestHours[0], format: "9:16, legenda queimada",
        paidTip: "Suba como anúncio o criativo de maior retenção orgânica.",
      })),
    };
  }
}

function describe(r: ReturnType<typeof applyBudgetChange>) {
  return { change: r.allowed ? `Verba ajustada para R$ ${r.finalBudget}` : r.reason, withinGuardrails: r.allowed };
}
function sum(ms: any[]) {
  return ms.reduce((a, m) => ({ spend: a.spend + m.spend, revenue: a.revenue + m.revenue, impressions: a.impressions + m.impressions, clicks: a.clicks + m.clicks, conversions: a.conversions + m.conversions }),
    { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 });
}

const CURATED_PRODUCTS = [
  { id: "p0", name: "Mini projetor portátil", category: "Eletrônicos", country: "Brasil", marketplace: "TikTok Shop", demandScore: 94, growth7d: 120, priceMin: 89, priceMax: 249, competition: "média", trend: [40, 55, 60, 72, 80, 88, 94], insight: "Unboxing no escuro + prova social. Vale tráfego pago em Reels/TikTok." },
  { id: "p1", name: "Escova alisadora 3 em 1", category: "Beleza", country: "Brasil", marketplace: "Shopee", demandScore: 88, growth7d: 64, priceMin: 59, priceMax: 159, competition: "alta", trend: [50, 58, 62, 70, 75, 82, 88], insight: "Antes/depois em 15s. Feminino 25-44. ROAS alto em Advantage+." },
];
const CURATED_VIDEOS = [
  { id: "v0", title: "Ela testou por 30 dias e...", network: "TikTok", country: "Global", views: 2400000, growth24h: 180, format: "Depoimento 9:16", hook: "\"Não acreditava até ver no dia 7.\"", whyItWorks: "Curiosidade + timeline prende nos 3s.", real: false },
];
const POSTING_WINDOWS = [
  { network: "TikTok", bestHours: ["12h", "19h", "21h"], note: "Pico de retenção à noite." },
  { network: "Instagram Reels", bestHours: ["11h", "13h", "20h"], note: "Almoço e pós-jantar convertem melhor." },
  { network: "YouTube Shorts", bestHours: ["18h", "20h", "22h"], note: "Consumo cresce à noite." },
];
