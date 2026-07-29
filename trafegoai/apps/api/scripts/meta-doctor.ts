/**
 * Diagnóstico da integração com a Meta.
 *
 *   npm run meta:doctor                  # confere as credenciais e mostra o link de autorização
 *   npm run meta:doctor -- --token=XXX   # usa um token e lista contas + métricas de verdade
 *
 * Não precisa de banco, servidor nem deploy: fala direto com a Graph API e
 * imprime o que encontrou. Serve para provar que as chaves funcionam antes de
 * subir qualquer coisa.
 */
import { MetaConnector, MetaApiError } from '../src/connectors/meta.connector';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const ok = (m: string) => console.log(`${C.green}✓${C.reset} ${m}`);
const fail = (m: string) => console.log(`${C.red}✗${C.reset} ${m}`);
const warn = (m: string) => console.log(`${C.yellow}!${C.reset} ${m}`);
const info = (m: string) => console.log(`${C.dim}  ${m}${C.reset}`);
const title = (m: string) => console.log(`\n${C.bold}${m}${C.reset}`);

function arg(name: string): string | undefined {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : undefined;
}

const BRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

async function main() {
  console.log(`${C.bold}${C.cyan}\nDiagnóstico da integração com a Meta${C.reset}`);
  console.log(`${C.dim}────────────────────────────────────────${C.reset}`);

  const meta = new MetaConnector();

  // ── 1. credenciais ────────────────────────────────────────────────────────
  title('1. Credenciais');
  if (!process.env.META_APP_ID) fail('META_APP_ID não definido');
  else ok(`META_APP_ID = ${process.env.META_APP_ID}`);

  if (!process.env.META_APP_SECRET) fail('META_APP_SECRET não definido');
  else ok(`META_APP_SECRET = ${'•'.repeat(8)}${process.env.META_APP_SECRET.slice(-4)}`);

  if (!meta.isConfigured) {
    console.log(`
${C.yellow}Como obter as chaves:${C.reset}
  1. Acesse https://developers.facebook.com/apps
  2. Criar app → tipo ${C.bold}Empresa${C.reset}
  3. Adicione o produto ${C.bold}Marketing API${C.reset}
  4. Em Configurações → Básico, copie o ID do app e a Chave secreta
  5. Coloque em ${C.bold}apps/api/.env${C.reset}:

     META_APP_ID=seu_id_aqui
     META_APP_SECRET=sua_chave_aqui

  Depois rode este comando de novo.
`);
    // Falta de configuração é um estado esperado, não uma falha do script.
    return;
  }

  // ── 2. URL de autorização ─────────────────────────────────────────────────
  title('2. Autorização');
  const authUrl = meta.buildAuthUrl('diagnostico');
  ok('URL de autorização gerada');
  info(authUrl);
  console.log(`
${C.dim}  Abra essa URL no navegador, autorize, e a Meta vai redirecionar para a URI
  cadastrada no app com um ?code=... na barra de endereço.${C.reset}`);

  // ── 3. teste com token ────────────────────────────────────────────────────
  const token = arg('token') || process.env.META_TEST_TOKEN;
  if (!token) {
    title('3. Teste com dados reais');
    warn('Nenhum token informado — parando aqui.');
    console.log(`
${C.dim}  Para testar de verdade, pegue um token em
  https://developers.facebook.com/tools/explorer
  (escolha seu app, permissões ${C.bold}ads_read${C.reset}${C.dim}) e rode:

     npm run meta:doctor -- --token=SEU_TOKEN${C.reset}
`);
    return;
  }

  title('3. Contas de anúncios');
  let accounts;
  try {
    accounts = await meta.listAdAccounts(token);
  } catch (e) {
    const err = e as MetaApiError;
    if (err.isNetwork) {
      fail('Não foi possível falar com a Meta.');
      info(err.message);
      info('Suas credenciais podem estar corretas — o problema é a conexão até graph.facebook.com.');
    } else {
      fail(`A Meta recusou a chamada: ${err.message}`);
      if (err.needsReauth) info('O token está expirado ou sem a permissão ads_read. Gere um novo.');
      else if (err.isRateLimit) info('Limite de chamadas atingido. Espere alguns minutos e tente de novo.');
    }
    process.exit(1);
  }

  if (!accounts.length) {
    warn('Nenhuma conta de anúncios encontrada nesse login.');
    info('Confirme que o usuário do token administra alguma conta no Gerenciador de Anúncios.');
    return;
  }
  ok(`${accounts.length} conta(s) encontrada(s)`);
  accounts.forEach((a) => info(`${a.name}  ${C.dim}(${a.id}${a.currency ? ', ' + a.currency : ''})${C.reset}`));

  // ── 4. métricas ───────────────────────────────────────────────────────────
  const days = Number(arg('days') || 7);
  const target = arg('conta') || accounts[0].id;
  title(`4. Métricas dos últimos ${days} dias — ${target}`);

  const iso = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
  let rows;
  try {
    rows = await meta.fetchDailyMetrics(token, target, iso(days), iso(0));
  } catch (e) {
    fail(`Falha ao ler as métricas: ${(e as Error).message}`);
    process.exit(1);
  }

  if (!rows.length) {
    warn('Nenhum dado no período. A conta pode não ter veiculado anúncios nesses dias.');
    return;
  }

  ok(`${rows.length} registro(s) normalizado(s)`);
  const tot = rows.reduce(
    (a, r) => ({
      spend: a.spend + r.spend, revenue: a.revenue + r.revenue,
      clicks: a.clicks + r.clicks, conversions: a.conversions + r.conversions,
      impressions: a.impressions + r.impressions,
    }),
    { spend: 0, revenue: 0, clicks: 0, conversions: 0, impressions: 0 },
  );
  const roas = tot.spend ? tot.revenue / tot.spend : 0;

  console.log(`
  ${C.bold}Consolidado${C.reset}
  Investimento  ${BRL(tot.spend)}
  Receita       ${BRL(tot.revenue)}
  ROAS          ${roas.toFixed(2)}x
  Conversões    ${tot.conversions}
  Cliques       ${tot.clicks}
  Impressões    ${tot.impressions}
`);

  console.log(`  ${C.bold}Amostra (3 primeiras linhas normalizadas)${C.reset}`);
  rows.slice(0, 3).forEach((r) => {
    info(`${r.date}  ${r.campaignName || r.externalCampaignId}  gasto ${BRL(r.spend)}  receita ${BRL(r.revenue)}  conv ${r.conversions}`);
  });

  console.log(`
${C.green}${C.bold}Integração funcionando.${C.reset} Esses números vieram da API da Meta e já
estão no formato que o painel usa. O próximo passo é subir a API com o banco
para guardar isso e aparecer no dashboard.
`);
}

main().catch((e) => {
  fail(`Erro inesperado: ${e?.message || e}`);
  process.exit(1);
});
