// Seed: agência com clientes, contas nas 3 plataformas, 90 dias de métricas
// (campanha e anúncio), recomendações, anomalias, regras, metas, relatórios.
import { PrismaClient, Platform } from "@prisma/client";
import { createHash } from "crypto";
import { encryptToken } from "../src/common/crypto.util";
import { deriveKpi } from "../src/common/metrics.util";

const prisma = new PrismaClient();
const rnd = (min: number, max: number) => min + Math.random() * (max - min);

async function main() {
  await prisma.$transaction([
    prisma.metricDaily.deleteMany(), prisma.ad.deleteMany(), prisma.adSet.deleteMany(),
    prisma.campaign.deleteMany(), prisma.connection.deleteMany(), prisma.goal.deleteMany(),
    prisma.report.deleteMany(), prisma.recommendation.deleteMany(), prisma.anomaly.deleteMany(),
    prisma.rule.deleteMany(), prisma.notification.deleteMany(), prisma.auditLog.deleteMany(),
    prisma.client.deleteMany(), prisma.user.deleteMany(), prisma.organization.deleteMany(),
  ]);

  const org = await prisma.organization.create({ data: { name: "Agência Demo", plan: "pro" } });
  await prisma.user.create({
    data: { name: "Gestor Demo", email: "demo@trafegoai.com", orgId: org.id,
      password: createHash("sha256").update("demo1234" + (process.env.PW_SALT || "trafegoai")).digest("hex") },
  });

  const clientsData = [
    { name: "Loja Aurora", logoColor: "#7c5cff" },
    { name: "FitPro Suplementos", logoColor: "#22c55e" },
    { name: "Studio Bela Pele", logoColor: "#f59e0b" },
  ];
  const platforms: Platform[] = [Platform.google, Platform.meta, Platform.tiktok];

  for (const [ci, cd] of clientsData.entries()) {
    const client = await prisma.client.create({ data: { ...cd, orgId: org.id } });
    for (const p of platforms) {
      await prisma.connection.create({
        data: { platform: p, accountName: `${cd.name} — ${p}`, clientId: client.id,
          accessToken: encryptToken("token-oauth-exemplo"), status: "active" },
      });
    }

    for (let k = 0; k < 4; k++) {
      const platform = platforms[(ci + k) % 3];
      const campaign = await prisma.campaign.create({
        data: { name: `Campanha ${cd.name} ${k + 1}`, platform, clientId: client.id,
          status: k === 3 ? "paused" : "active", budgetDaily: Math.round(rnd(80, 500)) },
      });
      // 90 dias de métricas em nível de campanha
      for (let d = 89; d >= 0; d--) {
        const spend = rnd(120, 480);
        await prisma.metricDaily.create({
          data: {
            date: new Date(Date.now() - d * 86400000), level: "campaign", campaignId: campaign.id,
            spend, revenue: spend * rnd(1.5, 4.5),
            impressions: Math.round(spend * rnd(180, 260)), clicks: Math.round(spend * rnd(3, 8)),
            conversions: Math.round(spend * rnd(0.05, 0.2)), frequency: rnd(1.2, 4.5),
          },
        });
      }
      // 1 conjunto + 1 anúncio com métricas de nível anúncio
      const adSet = await prisma.adSet.create({
        data: { name: "Conjunto 1", campaignId: campaign.id,
          targeting: { ageMin: 25, ageMax: 54, gender: "all", locations: ["Brasil"], interests: ["Compras online"] } },
      });
      const ad = await prisma.ad.create({ data: { name: "Criativo 1", adSetId: adSet.id, thumbnail: "🎬" } });
      for (let d = 30; d >= 0; d--) {
        const spend = rnd(30, 90);
        await prisma.metricDaily.create({
          data: { date: new Date(Date.now() - d * 86400000), level: "ad", adId: ad.id, adSetId: adSet.id,
            spend, revenue: spend * rnd(1.4, 4), impressions: Math.round(spend * 220),
            clicks: Math.round(spend * 5), conversions: Math.round(spend * 0.12), frequency: rnd(1.4, 6) },
        });
      }
    }

    await prisma.goal.create({ data: { clientId: client.id, label: `ROAS ${cd.name}`, metric: "roas", target: 3.5, current: 3.1, projectedEndOfMonth: 3.6 } });
    await prisma.report.create({ data: { clientId: client.id, name: `Relatório — ${cd.name}`, shareToken: `${cd.name.toLowerCase().replace(/\s+/g, "-")}-2026` } });
  }

  await prisma.recommendation.createMany({ data: [
    { title: "Realocar verba p/ vencedora", why: "ROAS 4,8 vs média 2,1.", action: "Aumentar orçamento +20%", impact: "alto", estimatedGain: "+R$ 3.400/mês", platform: Platform.meta },
    { title: "Pausar conjunto caro", why: "CPA R$ 92 há 9 dias.", action: "Pausar conjunto", impact: "alto", estimatedGain: "-R$ 1.900 desperdício", platform: Platform.google },
  ] });
  await prisma.anomaly.createMany({ data: [
    { metric: "Gasto", severity: "alta", message: "Pico de gasto +182% vs média.", zscore: 3.4 },
    { metric: "Conversões", severity: "média", message: "Queda de conversões -46% em 24h.", zscore: -2.6 },
  ] });
  await prisma.rule.createMany({ data: [
    { name: "Pausar conjunto caro", condition: "CPA > R$ 60 por 3 dias", action: "Pausar conjunto", budgetFloor: 20, budgetCap: 500, maxChangePct: 100, fires: 3 },
    { name: "Escalar vencedora", condition: "ROAS > 4 e frequência < 3", action: "Aumentar verba +20%", budgetFloor: 50, budgetCap: 600, maxChangePct: 20, fires: 5 },
  ] });

  console.log("Seed concluído: agência, 3 clientes, 9 conexões, 12 campanhas, 90 dias de métricas.");
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
