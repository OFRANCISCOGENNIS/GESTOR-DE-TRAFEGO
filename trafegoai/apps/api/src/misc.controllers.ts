import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { MetricsService } from "./metrics/metrics.service";
import { LlmService } from "./common/llm.service";

@Controller()
export class MiscController {
  constructor(private prisma: PrismaService, private metrics: MetricsService, private llm: LlmService) {}

  @Get("clients") clients() { return this.prisma.client.findMany(); }
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
