/**
 * Verificação da camada de banco (precisa de um Postgres acessível).
 *
 *   npm run verify:db
 *
 * Confere o que os testes unitários não alcançam: se o upsert por
 * (campanha, dia, nível) realmente evita duplicação ao reprocessar a mesma
 * janela de datas — situação normal, porque a Meta reprocessa a atribuição e
 * corrige números de dias anteriores.
 *
 * Rode depois de `npx prisma migrate deploy` e do seed.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EXT = '__verificacao_upsert__';

interface Row {
  date: string;
  externalCampaignId: string;
  campaignName: string;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  frequency: number;
}

// Mesmo caminho de gravação usado pelo MetaSyncService.
async function gravar(rows: Row[], clientId: string) {
  for (const r of rows) {
    const campaign = await prisma.campaign.upsert({
      where: { externalId_platform: { externalId: r.externalCampaignId, platform: 'meta' } },
      update: { name: r.campaignName },
      create: { externalId: r.externalCampaignId, name: r.campaignName, platform: 'meta', clientId },
    });
    const date = new Date(r.date + 'T00:00:00.000Z');
    const dados = {
      spend: r.spend, revenue: r.revenue, impressions: r.impressions,
      clicks: r.clicks, conversions: r.conversions, frequency: r.frequency,
    };
    await prisma.metricDaily.upsert({
      where: { campaignId_date_level: { campaignId: campaign.id, date, level: 'campaign' } },
      update: dados,
      create: { date, level: 'campaign', campaignId: campaign.id, ...dados },
    });
  }
}

async function limpar() {
  const c = await prisma.campaign.findFirst({ where: { externalId: EXT } });
  if (c) {
    await prisma.metricDaily.deleteMany({ where: { campaignId: c.id } });
    await prisma.campaign.deleteMany({ where: { id: c.id } });
  }
}

async function main() {
  const client = await prisma.client.findFirst();
  if (!client) {
    console.log('✗ Nenhum cliente no banco. Rode `npm run seed` antes.');
    process.exit(1);
  }
  await limpar(); // garante começo limpo se uma execução anterior falhou

  const base: Row[] = [
    { date: '2026-07-01', externalCampaignId: EXT, campaignName: 'Verificação', spend: 100, revenue: 300, impressions: 1000, clicks: 50, conversions: 5, frequency: 1.5 },
    { date: '2026-07-02', externalCampaignId: EXT, campaignName: 'Verificação', spend: 120, revenue: 400, impressions: 1200, clicks: 60, conversions: 6, frequency: 1.6 },
  ];

  await gravar(base, client.id);
  const camp = (await prisma.campaign.findFirst({ where: { externalId: EXT } }))!;
  const primeira = await prisma.metricDaily.count({ where: { campaignId: camp.id } });

  // Reprocessa os mesmos dias com valores corrigidos.
  await gravar(base.map((r) => ({ ...r, revenue: r.revenue + 50, conversions: r.conversions + 1 })), client.id);
  const segunda = await prisma.metricDaily.count({ where: { campaignId: camp.id } });
  const campanhas = await prisma.campaign.count({ where: { externalId: EXT } });
  const dia1 = await prisma.metricDaily.findFirst({
    where: { campaignId: camp.id, date: new Date('2026-07-01T00:00:00.000Z') },
  });

  const erros: string[] = [];
  if (primeira !== 2) erros.push(`primeira gravação: esperava 2 linhas, obteve ${primeira}`);
  if (segunda !== 2) erros.push(`reprocessamento DUPLICOU: ${segunda} linhas em vez de 2`);
  if (campanhas !== 1) erros.push(`campanha duplicada: ${campanhas} registros`);
  if (dia1?.revenue !== 350) erros.push(`valor não atualizado: receita ${dia1?.revenue}, esperado 350`);
  if (dia1?.conversions !== 6) erros.push(`conversões não atualizadas: ${dia1?.conversions}, esperado 6`);

  await limpar();

  if (erros.length) {
    console.log('✗ ' + erros.join('\n✗ '));
    process.exit(1);
  }
  console.log('✓ Upsert correto: reprocessar a mesma janela atualiza os valores sem duplicar.');
  console.log(`  ${primeira} linhas na primeira passagem, ${segunda} na segunda, ${campanhas} campanha.`);
}

main()
  .catch((e) => {
    console.log(`✗ Falhou: ${e?.message || e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
