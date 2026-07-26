import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { MetricsService } from "./metrics/metrics.service";
import { LlmService } from "./common/llm.service";
import { deriveKpi, sumMetrics } from "./common/metrics.util";

@Controller()
export class MiscController {
  constructor(private prisma: PrismaService, private metrics: MetricsService, private llm: LlmService) {}

  @Get("clients") clients() { return this.prisma.client.findMany(); }

  // Perfil de cliente (gestão do perfil de alguém — modo agência).
  @Get("clients/:id/profile")
  async clientProfile(@Param("id") id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) return null;
    const [connections, campaigns, goals, rules, reports, recs] = await Promise.all([
      this.prisma.connection.findMany({ where: { clientId: id } }),
      this.prisma.campaign.findMany({ where: { clientId: id }, include: { metrics: true } }),
      this.prisma.goal.findMany({ where: { clientId: id } }),
      this.prisma.rule.findMany(),
      this.prisma.report.findMany({ where: { clientId: id } }),
      this.prisma.recommendation.findMany(),
    ]);
    const kpi = deriveKpi(sumMetrics(campaigns.flatMap((c) => c.metrics as any)));
    const connectionsOk = connections.length > 0 && connections.every((c) => c.status === "active");
    const activeRules = rules.filter((r) => r.enabled).length;
    const appliedRecs = recs.filter((r) => r.status === "applied").length;
    const openRecommendations = recs.filter((r) => r.status === "open").length;
    const guide = [
      { id: "accounts", title: "Revisar contas conectadas", description: connectionsOk ? `${connections.length} conta(s) ativas.` : "Há conta(s) com problema — reautentique.", done: connectionsOk, href: "/connections", cta: "Ver conexões" },
      { id: "goals", title: "Definir metas do cliente", description: goals.length ? `${goals.length} meta(s) configurada(s).` : "Nenhuma meta definida ainda.", done: goals.length > 0, href: "/goals", cta: "Definir metas" },
      { id: "diagnosis", title: "Ler o diagnóstico da IA", description: "Veja o que vai bem e o que queima verba.", done: false, href: "/recommendations", cta: "Abrir diagnóstico" },
      { id: "recs", title: "Aplicar recomendações", description: `${appliedRecs} aplicada(s), ${openRecommendations} em aberto.`, done: appliedRecs > 0, href: "/recommendations", cta: "Ver recomendações" },
      { id: "rules", title: "Ativar automações com guardrails", description: activeRules ? `${activeRules} regra(s) ativa(s).` : "Sem automações ativas.", done: activeRules > 0, href: "/automations", cta: "Configurar automações" },
      { id: "report", title: "Agendar relatório white-label", description: reports.length ? "Relatório pronto para compartilhar." : "Nenhum relatório ainda.", done: reports.length > 0, href: "/reports", cta: "Gerar relatório" },
    ];
    const doneCount = guide.filter((s) => s.done).length;
    const score = Math.round((doneCount / guide.length) * 100);
    return {
      client, kpi, connections, goals, openRecommendations, activeRules,
      hasReport: reports.length > 0,
      campaigns: campaigns.map((c) => ({ ...c, kpi: deriveKpi(sumMetrics(c.metrics as any)) })),
      contact: { owner: "—", email: "—", phone: "—", segment: "—", since: "—" },
      guide,
      health: { score, label: score >= 80 ? "Perfil saudável" : score >= 50 ? "Precisa de atenção" : "Requer ação urgente" },
    };
  }

  @Get("connections") connections() { return this.prisma.connection.findMany(); }
  @Post("connections/:id/sync")
  sync(@Param("id") id: string) {
    // Sincronização manual. Enfileira job de sync no worker (BullMQ) na versão real.
    return this.prisma.connection.update({ where: { id }, data: { status: "active", lastSync: new Date() } });
  }

  @Get("goals") goals() { return this.prisma.goal.findMany(); }
  @Get("audit") audit() { return this.prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 50 }); }
  @Get("notifications") notifications() { return this.prisma.notification.findMany({ orderBy: { at: "desc" }, take: 20 }); }
  @Post("notifications/read")
  async readAll() { await this.prisma.notification.updateMany({ data: { read: true } }); return { ok: true }; }

  @Get("reports") reports() { return this.prisma.report.findMany(); }
  @Get("reports/:token")
  async report(@Param("token") token: string) {
    const report = await this.prisma.report.findUnique({ where: { shareToken: token } });
    const client = report ? await this.prisma.client.findUnique({ where: { id: report.clientId } }) : null;
    return { report, client, dashboard: { summary: await this.metrics.summary("30d"), split: [] } };
  }

  @Post("chat")
  async chat(@Body() body: { message: string }) {
    const s = await this.metrics.summary("30d");
    return { reply: await this.llm.chat(body.message, s.current) };
  }

  @Post("creatives/generate")
  generate(@Body() body: { product: string; platform: string }) {
    const p = body?.product || "seu produto";
    return {
      headlines: [`${p}: resultado que dá pra ver`, `A escolha certa pra ${p}`, `${p} com frete grátis`],
      primaryTexts: [`Cansou de tentar sem resultado? ${p} entrega praticidade e resultado real.`, `+10 mil clientes já aprovaram ${p}.`],
      descriptions: ["Entrega rápida e garantia de 7 dias.", "Oferta acaba à meia-noite."],
      ctas: ["Comprar agora", "Quero o meu", "Ver oferta"],
      angles: ["Prova social", "Escassez / urgência", "Antes e depois"],
    };
  }
  @Get("creatives") creatives() { return this.prisma.ad.findMany({ take: 12, include: { metrics: true } }); }

  @Get("billing/plans") plans() { return PLANS; }
  @Post("billing/checkout")
  async checkout(@Body() body: { plan: string }) {
    // PONTO DE INTEGRAÇÃO: Stripe Checkout + webhook. Sem chave, aplica plano no modo demo.
    const org = await this.prisma.organization.findFirst();
    if (org) await this.prisma.organization.update({ where: { id: org.id }, data: { plan: body.plan } });
    return { ok: true, demo: !process.env.STRIPE_SECRET_KEY, plan: body.plan };
  }
}

const PLANS = [
  { id: "starter", name: "Starter", monthly: 97, features: ["1 cliente", "3 contas conectadas", "Dashboard + IA básica", "Radar de tendências"] },
  { id: "pro", name: "Pro", monthly: 197, features: ["5 clientes", "Contas ilimitadas", "Automações + regras", "Chat IA + criativos", "Relatórios PDF"] },
  { id: "agency", name: "Agência", monthly: 397, features: ["Clientes ilimitados", "White-label + link", "Papéis e permissões", "Suporte prioritário"] },
];
