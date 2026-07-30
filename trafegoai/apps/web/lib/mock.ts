// ────────────────────────────────────────────────────────────────────────────
// "Backend embutido no navegador" (modo demonstração).
// Quando NEXT_PUBLIC_DEMO_MODE=true (ou não há NEXT_PUBLIC_API_URL), o api client
// (lib/api.ts) roteia TODAS as chamadas para cá. Respostas realistas + estado
// mutável em memória (pausar campanha, aplicar recomendação, trocar plano, etc.).
// Isso permite publicar SÓ o frontend (Vercel/Netlify) sem API/Postgres/Redis.
// ────────────────────────────────────────────────────────────────────────────
import { deriveKpi, sumMetrics, pctChange, round, type MetricDaily } from "./metrics";
import type {
  Ad, AdSet, Anomaly, AuditEntry, Campaign, ChatMessage, Client, ClientProfile,
  Connection, Creative, DashboardSummary, FunnelStep, Goal, HeatCell, Highlight,
  Kpi, ManagementStep, Notification, Plan, PlanId, Platform, PostingWindow,
  Product, Recommendation, Report, Rule, TimePoint, PlatformSplit, TrendingVideo,
  VideoAnalysis,
} from "./types";

// ── RNG determinístico (mesmos dados a cada boot => sem mismatch de hidratação) ─
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260725);
const rand = (min: number, max: number) => min + rnd() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

const PLATFORMS: Platform[] = ["google", "meta", "tiktok"];

// ── Estado em memória ──────────────────────────────────────────────────────────
interface DB {
  clients: Client[];
  connections: Connection[];
  campaigns: Campaign[];
  adSets: AdSet[];
  ads: Ad[];
  recommendations: Recommendation[];
  anomalies: Anomaly[];
  rules: Rule[];
  goals: Goal[];
  creatives: Creative[];
  reports: Report[];
  notifications: Notification[];
  audit: AuditEntry[];
  series: Record<string, MetricDaily[]>; // campaignId -> 90 dias
  plan: PlanId;
  chat: ChatMessage[];
}

let db: DB | null = null;

// ── Datas dos últimos 90 dias (base fixa p/ evitar Date.now no SSR) ─────────────
const BASE = new Date("2026-07-25T00:00:00Z").getTime();
function dayIso(offset: number): string {
  return new Date(BASE - offset * 86400000).toISOString().slice(0, 10);
}

function makeSeries(base: number, growth: number, quality: number): MetricDaily[] {
  const out: MetricDaily[] = [];
  for (let i = 89; i >= 0; i--) {
    const trend = 1 + (89 - i) * growth;
    const noise = rand(0.82, 1.18);
    const spend = round(base * trend * noise, 2);
    const impressions = Math.round(spend * rand(180, 260));
    const ctr = rand(0.9, 2.6) / 100;
    const clicks = Math.round(impressions * ctr);
    const convRate = rand(2, 7) / 100 * quality;
    const conversions = Math.max(0, Math.round(clicks * convRate));
    const ticket = rand(60, 220);
    const revenue = round(conversions * ticket, 2);
    out.push({ spend, revenue, impressions, clicks, conversions, frequency: round(rand(1.1, 4.2), 1) });
  }
  return out;
}

function seed(): DB {
  const clients: Client[] = [
    { id: "c1", name: "Loja Aurora", logoColor: "#7c5cff" },
    { id: "c2", name: "FitPro Suplementos", logoColor: "#22c55e" },
    { id: "c3", name: "Studio Bela Pele", logoColor: "#f59e0b" },
  ];

  const connections: Connection[] = [
    { id: "cn1", platform: "google", accountName: "Loja Aurora — Google Ads", status: "active", lastSync: "há 6 min" },
    { id: "cn2", platform: "meta", accountName: "Loja Aurora — Meta Business", status: "active", lastSync: "há 6 min" },
    { id: "cn3", platform: "tiktok", accountName: "FitPro — TikTok Ads", status: "active", lastSync: "há 12 min" },
    { id: "cn4", platform: "meta", accountName: "FitPro — Meta Business", status: "expired", lastSync: "há 2 dias" },
    { id: "cn5", platform: "google", accountName: "Bela Pele — Google Ads", status: "error", lastSync: "há 4 h" },
  ];

  const campaigns: Campaign[] = [];
  const adSets: AdSet[] = [];
  const ads: Ad[] = [];
  const series: Record<string, MetricDaily[]> = {};

  const names = [
    "Remarketing Quente", "Prospecção Fria", "Escala Vencedora", "Black Novembro",
    "Catálogo Dinâmico", "Vídeo Depoimento", "Busca Marca", "Público Semelhante 1%",
    "Interesses Fitness", "Retargeting Carrinho", "Topo de Funil", "Lookalike Compradores",
  ];
  let ci = 0;
  for (const client of clients) {
    for (let k = 0; k < 4; k++) {
      const platform = PLATFORMS[(ci + k) % 3];
      const id = `cmp${++ci}`;
      const growth = rand(-0.004, 0.012);
      const quality = rand(0.7, 1.5);
      const s = makeSeries(rand(120, 480), growth, quality);
      series[id] = s;
      const kpi = deriveKpi(sumMetrics(s.slice(-30)));
      const status: Campaign["status"] = k === 3 ? "paused" : k === 2 ? "learning" : "active";
      campaigns.push({
        id, name: `${pick(names)} ${k + 1}`, platform, clientId: client.id,
        status, budgetDaily: round(rand(80, 500), 0), kpi,
      });

      for (let a = 0; a < 3; a++) {
        const asId = `${id}-as${a}`;
        const asS = makeSeries(rand(40, 160), growth, quality);
        const asKpi = deriveKpi(sumMetrics(asS.slice(-30)));
        adSets.push({
          id: asId, campaignId: id, name: `Conjunto ${a + 1}`,
          status: a === 2 ? "paused" : "active", kpi: asKpi,
          targeting: {
            ageMin: pick([18, 25, 30]), ageMax: pick([44, 54, 65]),
            gender: pick(["all", "female", "male"]),
            locations: pick([["Brasil"], ["São Paulo", "Rio de Janeiro"], ["Sul", "Sudeste"]]),
            interests: pick([["Moda", "Beleza"], ["Fitness", "Nutrição"], ["Tecnologia", "Compras online"]]),
          },
        });
        for (let d = 0; d < 2; d++) {
          const adS = makeSeries(rand(20, 90), growth, quality);
          const adKpi = deriveKpi(sumMetrics(adS.slice(-30)));
          const freq = round(rand(1.4, 6.5), 1);
          ads.push({
            id: `${asId}-ad${d}`, adSetId: asId, name: `Criativo ${a + 1}.${d + 1}`,
            status: "active", kpi: adKpi, frequency: freq,
            fatigueScore: Math.min(100, Math.round(freq * 12 + rand(0, 30))),
            thumbnail: pick(["🎬", "📸", "🎞️", "🖼️", "📹"]),
          });
        }
      }
    }
  }

  const recommendations: Recommendation[] = [
    { id: "r1", title: "Realocar 20% da verba p/ 'Escala Vencedora'", why: "ROAS 4,8 vs média 2,1; ainda com espaço de escala e frequência saudável.", action: "Aumentar orçamento de R$ 250 → R$ 300/dia", impact: "alto", estimatedGain: "+R$ 3.400/mês", platform: "meta", status: "open" },
    { id: "r2", title: "Pausar conjunto 'Prospecção Fria 3'", why: "CPA R$ 92 (meta R$ 45) há 9 dias, sem conversões nos últimos 3.", action: "Pausar conjunto", impact: "alto", estimatedGain: "-R$ 1.900 desperdício", platform: "google", status: "open" },
    { id: "r3", title: "Trocar criativo com fadiga em 'Vídeo Depoimento'", why: "CTR caiu 38% e frequência subiu p/ 5,8 nos últimos 14 dias.", action: "Subir novo criativo", impact: "médio", estimatedGain: "+0,6 pt CTR", platform: "tiktok", status: "open" },
    { id: "r4", title: "Concentrar lances no pico das 19h–22h", why: "72% das conversões acontecem nesse intervalo; CPA 31% menor.", action: "Ajustar programação de anúncios", impact: "médio", estimatedGain: "-14% CPA", platform: "google", status: "open" },
    { id: "r5", title: "Ativar público semelhante 1% de compradores", why: "Base de 8.4k compradores nos últimos 90 dias; lookalike costuma render ROAS 3+.", action: "Criar conjunto lookalike", impact: "médio", estimatedGain: "+R$ 2.100/mês", platform: "meta", status: "open" },
  ];

  const anomalies: Anomaly[] = [
    { id: "a1", metric: "Gasto", severity: "alta", message: "Pico de gasto em 'Catálogo Dinâmico': +182% vs média diária.", zscore: 3.4, at: "há 22 min" },
    { id: "a2", metric: "Conversões", severity: "média", message: "Queda de conversões na conta Meta da FitPro (-46% em 24h).", zscore: -2.6, at: "há 1 h" },
    { id: "a3", metric: "Entrega", severity: "alta", message: "Conta Google 'Bela Pele' sem entrega — possível tracking quebrado.", zscore: -3.1, at: "há 4 h" },
  ];

  const rules: Rule[] = [
    { id: "rl1", name: "Pausar conjunto caro", enabled: true, condition: "CPA > R$ 60 por 3 dias", action: "Pausar conjunto", budgetFloor: 20, budgetCap: 500, maxChangePct: 100, lastRun: "há 12 min", fires: 3 },
    { id: "rl2", name: "Escalar vencedora", enabled: true, condition: "ROAS > 4 e frequência < 3", action: "Aumentar verba +20%", budgetFloor: 50, budgetCap: 600, maxChangePct: 20, lastRun: "há 12 min", fires: 5 },
    { id: "rl3", name: "Proteger orçamento", enabled: false, condition: "Gasto diário > teto", action: "Pausar campanha", budgetFloor: 0, budgetCap: 400, maxChangePct: 100, fires: 0 },
  ];

  const goals: Goal[] = [
    { id: "g1", clientId: "c1", label: "ROAS Loja Aurora", metric: "roas", target: 3.5, current: 3.1, projectedEndOfMonth: 3.6 },
    { id: "g2", clientId: "c2", label: "CPA-alvo FitPro", metric: "cpa", target: 40, current: 47, projectedEndOfMonth: 42 },
    { id: "g3", clientId: "c1", label: "Orçamento mensal Aurora", metric: "budget", target: 30000, current: 21400, projectedEndOfMonth: 29800 },
  ];

  const creatives: Creative[] = ads.slice(0, 10).map((a, i) => ({
    id: `cr${i}`,
    headline: pick(["Frete grátis hoje", "Últimas unidades", "Resultado em 7 dias", "Aprovado por +10 mil clientes", "Desconto exclusivo"]),
    primaryText: pick(["Descubra por que todo mundo está comprando.", "A oferta acaba à meia-noite.", "Você merece o melhor — comprove.", "Transforme sua rotina agora."]),
    platform: PLATFORMS[i % 3],
    performanceScore: round(rand(40, 98), 0),
    ctr: a.kpi.ctr,
    fatigueScore: a.fatigueScore,
  }));

  const reports: Report[] = [
    { id: "rep1", clientId: "c1", name: "Relatório mensal — Loja Aurora", shareToken: "aurora-julho-2026", createdAt: dayIso(2) },
    { id: "rep2", clientId: "c2", name: "Relatório semanal — FitPro", shareToken: "fitpro-s30-2026", createdAt: dayIso(5) },
  ];

  const notifications: Notification[] = [
    { id: "n1", kind: "anomaly", message: anomalies[0].message, at: "há 22 min", read: false },
    { id: "n2", kind: "rule", message: "Regra 'Escalar vencedora' disparou em 'Escala Vencedora 3'.", at: "há 12 min", read: false },
    { id: "n3", kind: "anomaly", message: anomalies[2].message, at: "há 4 h", read: true },
  ];

  const audit: AuditEntry[] = [
    { id: "au1", action: "Aplicou recomendação", target: "Realocar verba — Escala Vencedora", user: "você", at: dayIso(0) },
    { id: "au2", action: "Pausou conjunto", target: "Prospecção Fria 3", user: "regra automática", at: dayIso(0) },
    { id: "au3", action: "Alterou orçamento", target: "Catálogo Dinâmico (R$ 200→R$ 250)", user: "você", at: dayIso(1) },
  ];

  return {
    clients, connections, campaigns, adSets, ads, recommendations, anomalies,
    rules, goals, creatives, reports, notifications, audit, series,
    plan: "pro", chat: [],
  };
}

function getDb(): DB {
  if (!db) db = seed();
  return db;
}

// ── Agregações do dashboard ─────────────────────────────────────────────────────
function periodDays(period: string): number {
  if (period === "today") return 1;
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  return 30;
}

function dashboard(period: string): {
  summary: DashboardSummary; timeseries: TimePoint[]; funnel: FunnelStep[];
  split: PlatformSplit[]; heatmap: HeatCell[]; highlights: Highlight[];
} {
  const d = getDb();
  const days = periodDays(period);
  const all = d.campaigns.map((c) => d.series[c.id]);
  const cur = sumMetrics(all.map((s) => sumMetrics(s.slice(-days))));
  const prev = sumMetrics(all.map((s) => sumMetrics(s.slice(-days * 2, -days))));
  const curK = deriveKpi(cur);
  const prevK = deriveKpi(prev);
  const deltas = {} as Record<keyof Kpi, number>;
  (Object.keys(curK) as (keyof Kpi)[]).forEach((k) => {
    deltas[k] = pctChange(curK[k], prevK[k]);
  });

  const timeseries: TimePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = sumMetrics(all.map((s) => s[s.length - 1 - i]));
    timeseries.push({ date: dayIso(i), spend: round(day.spend, 0), revenue: round(day.revenue, 0) });
  }

  const funnel: FunnelStep[] = [
    { step: "Impressões", value: cur.impressions },
    { step: "Cliques", value: cur.clicks },
    { step: "Conversões", value: cur.conversions },
  ];

  const split: PlatformSplit[] = PLATFORMS.map((p) => {
    const cs = d.campaigns.filter((c) => c.platform === p).map((c) => sumMetrics(d.series[c.id].slice(-days)));
    const s = sumMetrics(cs);
    return { platform: p, spend: round(s.spend, 0), revenue: round(s.revenue, 0) };
  });

  const heatmap: HeatCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const peak = hour >= 18 && hour <= 22 ? 1.8 : hour >= 11 && hour <= 14 ? 1.3 : 0.5;
      const weekend = day === 0 || day === 6 ? 1.2 : 1;
      heatmap.push({ day, hour, value: round(peak * weekend * rand(0.6, 1.2) * 40, 0) });
    }
  }

  const ranked = [...d.campaigns].sort((a, b) => b.kpi.roas - a.kpi.roas);
  const highlights: Highlight[] = [
    { kind: "best", title: "Melhor campanha", description: `${ranked[0].name} — ROAS ${ranked[0].kpi.roas}`, campaignId: ranked[0].id },
    { kind: "worst", title: "Pior campanha", description: `${ranked[ranked.length - 1].name} — ROAS ${ranked[ranked.length - 1].kpi.roas}`, campaignId: ranked[ranked.length - 1].id },
    { kind: "waste", title: "Maior desperdício", description: `${ranked[ranked.length - 1].name} — CPA R$ ${ranked[ranked.length - 1].kpi.cpa}`, campaignId: ranked[ranked.length - 1].id },
    { kind: "opportunity", title: "Oportunidade do dia", description: d.recommendations[0].title, campaignId: ranked[0].id },
  ];

  return { summary: { current: curK, deltas }, timeseries, funnel, split, heatmap, highlights };
}

// ── Perfil de cliente (gestão do perfil de alguém — modo agência) ───────────────
const CLIENT_META: Record<string, { owner: string; email: string; phone: string; segment: string; since: string }> = {
  c1: { owner: "Marina Alves", email: "marina@lojaaurora.com.br", phone: "(11) 98888-1201", segment: "E-commerce de moda", since: "jan/2025" },
  c2: { owner: "Rafael Nunes", email: "rafael@fitprosupps.com", phone: "(21) 97777-3410", segment: "Suplementos / saúde", since: "mar/2025" },
  c3: { owner: "Camila Rocha", email: "camila@studiobelapele.com", phone: "(31) 96666-5588", segment: "Estética / skincare", since: "set/2025" },
};

// Vincula uma conexão a um cliente pelo nome (palavras significativas do nome).
function connectionsOfClient(client: Client, all: Connection[]): Connection[] {
  const keys = client.name.split(" ").filter((w) => w.length > 3).map((w) => w.toLowerCase());
  return all.filter((cn) => keys.some((k) => cn.accountName.toLowerCase().includes(k)));
}

function clientProfile(id: string): ClientProfile | null {
  const d = getDb();
  const client = d.clients.find((c) => c.id === id);
  if (!client) return null;

  const campaigns = d.campaigns.filter((c) => c.clientId === id);
  const kpi = deriveKpi(sumMetrics(campaigns.map((c) => sumMetrics(d.series[c.id].slice(-30)))));
  const connections = connectionsOfClient(client, d.connections);
  const goals = d.goals.filter((g) => g.clientId === id);
  const openRecommendations = d.recommendations.filter((r) => r.status === "open").length;
  const appliedRecs = d.recommendations.filter((r) => r.status === "applied").length;
  const activeRules = d.rules.filter((r) => r.enabled).length;
  const hasReport = d.reports.some((r) => r.clientId === id);
  const contact = CLIENT_META[id] ?? { owner: "—", email: "—", phone: "—", segment: "—", since: "—" };

  const connectionsOk = connections.length > 0 && connections.every((c) => c.status === "active");
  const guide: ManagementStep[] = [
    { id: "accounts", title: "Revisar contas conectadas", description: connectionsOk ? `${connections.length} conta(s) ativas e sincronizando.` : `Há conta(s) expiradas ou com erro — reautentique para não perder dados.`, done: connectionsOk, href: "/connections", cta: "Ver conexões" },
    { id: "goals", title: "Definir metas do cliente", description: goals.length ? `${goals.length} meta(s) configurada(s) com projeção de fim de mês.` : "Nenhuma meta definida ainda — comece por ROAS ou CPA-alvo.", done: goals.length > 0, href: "/goals", cta: "Definir metas" },
    { id: "diagnosis", title: "Ler o diagnóstico da IA", description: "Veja o que vai bem e o que queima verba neste perfil, em linguagem simples.", done: false, href: "/recommendations", cta: "Abrir diagnóstico" },
    { id: "recs", title: "Aplicar recomendações", description: appliedRecs ? `${appliedRecs} recomendação(ões) já aplicada(s); ${openRecommendations} em aberto.` : `${openRecommendations} recomendação(ões) esperando ação.`, done: appliedRecs > 0, href: "/recommendations", cta: "Ver recomendações" },
    { id: "rules", title: "Ativar automações com guardrails", description: activeRules ? `${activeRules} regra(s) ativa(s) protegendo o orçamento.` : "Sem automações ativas — crie regras se→então com preview.", done: activeRules > 0, href: "/automations", cta: "Configurar automações" },
    { id: "report", title: "Agendar relatório white-label", description: hasReport ? "Relatório do cliente pronto para compartilhar por link ou PDF." : "Nenhum relatório para este cliente ainda.", done: hasReport, href: "/reports", cta: "Gerar relatório" },
  ];

  const doneCount = guide.filter((s) => s.done).length;
  const score = Math.round((doneCount / guide.length) * 100);
  const label = score >= 80 ? "Perfil saudável" : score >= 50 ? "Precisa de atenção" : "Requer ação urgente";

  return { client, contact, kpi, connections, campaigns, goals, openRecommendations, activeRules, hasReport, guide, health: { score, label } };
}

// ── Radar de tendências (curado / mock) ─────────────────────────────────────────
function trendingProducts(): Product[] {
  const base = [
    { name: "Mini projetor portátil", category: "Eletrônicos", marketplace: "TikTok Shop" as const, insight: "Vídeo de unboxing no escuro + prova social. Vale tráfego pago em Reels/TikTok." },
    { name: "Escova alisadora 3 em 1", category: "Beleza", marketplace: "Shopee" as const, insight: "Antes/depois em 15s. Público feminino 25-44. ROAS alto em Meta Advantage+." },
    { name: "Garrafa térmica 2L", category: "Fitness", marketplace: "Mercado Livre" as const, insight: "Trend de hidratação. Criativo UGC + desconto por tempo. Bom p/ TikTok Spark Ads." },
    { name: "Organizador de cabos magnético", category: "Casa", marketplace: "Amazon" as const, insight: "Satisfação visual. Vídeo demonstração loop. Baixo ticket, escale volume." },
    { name: "Luminária pôr do sol", category: "Decoração", marketplace: "TikTok Shop" as const, insight: "Estética viral. Ambientação de quarto. Público 18-30 no TikTok." },
    { name: "Massageador de pescoço EMS", category: "Saúde", marketplace: "Shopee" as const, insight: "Dor de trabalho remoto. Depoimento + garantia. Meta + Google Shopping." },
  ];
  const countries = ["Brasil", "Portugal", "México"];
  return base.map((b, i) => ({
    id: `p${i}`, ...b, country: countries[i % 3],
    demandScore: round(rand(72, 98), 0),
    growth7d: round(rand(12, 140), 0),
    priceMin: round(rand(29, 89), 0), priceMax: round(rand(99, 299), 0),
    competition: pick(["baixa", "média", "alta"]),
    trend: Array.from({ length: 7 }, () => round(rand(30, 100), 0)),
  }));
}

function trendingVideos(): TrendingVideo[] {
  const items: Omit<TrendingVideo, "id" | "views" | "growth24h" | "country">[] = [
    { title: "Ela testou por 30 dias e...", network: "TikTok", format: "Depoimento 9:16", hook: "\"Eu não acreditava até ver o resultado no dia 7.\"", whyItWorks: "Curiosidade + timeline concreta prende nos 3s. Prova social real." },
    { title: "3 erros que queimam sua verba", network: "Reels", format: "Educativo rápido", hook: "\"O erro nº 2 custou R$ 4 mil pro meu cliente.\"", whyItWorks: "Perda + número específico gera medo e autoridade imediata." },
    { title: "POV: seu anúncio finalmente vendeu", network: "Shorts", format: "POV humor", hook: "Corte seco no problema, sem intro.", whyItWorks: "Formato POV + humor aumenta retenção e compartilhamento." },
    { title: "Unboxing do produto que viralizou", network: "YouTube", format: "Unboxing", hook: "\"Comprei o mais vendido do TikTok Shop.\"", whyItWorks: "Ancoragem no viral + entrega de expectativa. Bom p/ review pago." },
  ];
  const countries = ["Global", "Brasil", "EUA", "Global"];
  return items.map((v, i) => ({
    id: `v${i}`, ...v, country: countries[i],
    views: Math.round(rand(180000, 4200000)),
    growth24h: round(rand(8, 320), 0),
    real: false,
  }));
}

function analyzeVideo(desc: string): VideoAnalysis {
  const strong = desc.length > 40;
  return {
    verdict: strong
      ? "Boa base: a ideia tem gancho, mas os 3 primeiros segundos precisam entregar o conflito antes do contexto. Corte a introdução."
      : "Precisa de mais substância. Sem um gancho claro nos 3s primeiros, a retenção cai e o CPM sobe. Reescreva a abertura.",
    score: strong ? randInt(68, 86) : randInt(40, 60),
    hooks: [
      "\"Ninguém te conta isso sobre [tema]...\"",
      "\"Eu testei por 7 dias — o resultado me surpreendeu.\"",
      "\"Se você faz isso, está perdendo dinheiro todo dia.\"",
    ],
    plans: [
      { network: "TikTok", title: "O erro de tráfego que te custa caro (testei)", hashtags: ["#trafegopago", "#marketingdigital", "#ads"], bestTime: "19h–22h", format: "9:16, legenda queimada, corte a cada 2s", paidTip: "Suba como Spark Ad no criativo com maior retenção orgânica." },
      { network: "Reels", title: "3 erros que queimam sua verba de anúncio", hashtags: ["#gestordetrafego", "#meta", "#instagram"], bestTime: "12h e 20h", format: "9:16, texto grande, CTA no fim", paidTip: "Use Advantage+ com público amplo; deixe o algoritmo achar o comprador." },
      { network: "YouTube Shorts", title: "Como dobrei o ROAS em 14 dias", hashtags: ["#shorts", "#googleads", "#roas"], bestTime: "18h–21h", format: "Vertical, 45s, thumbnail forte", paidTip: "Reaproveite como discovery ad segmentando por interesse." },
    ],
  };
}

const POSTING_WINDOWS: PostingWindow[] = [
  { network: "TikTok", bestHours: ["12h", "19h", "21h"], note: "Pico de retenção à noite; testes ao meio-dia." },
  { network: "Instagram Reels", bestHours: ["11h", "13h", "20h"], note: "Almoço e pós-jantar convertem melhor." },
  { network: "YouTube Shorts", bestHours: ["18h", "20h", "22h"], note: "Consumo cresce à noite; alinhe com horário de compra." },
  { network: "YouTube", bestHours: ["19h", "21h"], note: "Vídeos longos performam no fim do dia." },
];

const PLANS: Plan[] = [
  { id: "starter", name: "Starter", monthly: 97, features: ["1 cliente", "3 contas conectadas", "Dashboard + IA básica", "Radar de tendências"] },
  { id: "pro", name: "Pro", monthly: 197, features: ["5 clientes", "Contas ilimitadas", "Automações + regras", "Chat IA + criativos", "Relatórios PDF"] },
  { id: "agency", name: "Agência", monthly: 397, features: ["Clientes ilimitados", "White-label + link", "Papéis e permissões", "API + suporte prioritário"] },
];

// ── Utilidades de resposta ──────────────────────────────────────────────────────
function findAdSets(campaignId: string): AdSet[] {
  return getDb().adSets.filter((a) => a.campaignId === campaignId);
}
function findAds(adSetId: string): Ad[] {
  return getDb().ads.filter((a) => a.adSetId === adSetId);
}
function logAudit(action: string, target: string) {
  getDb().audit.unshift({ id: `au${Date.now()}`, action, target, user: "você", at: dayIso(0) });
}

// ── Roteador principal ──────────────────────────────────────────────────────────
export async function mockRequest(method: string, path: string, body?: any): Promise<any> {
  const d = getDb();
  const [route, query] = path.split("?");
  const params = new URLSearchParams(query || "");
  const period = params.get("period") || "30d";
  // pequena latência p/ exercitar estados de loading
  await new Promise((r) => setTimeout(r, 120));

  // auth
  if (route === "/auth/login" || route === "/auth/register") {
    return { token: "demo-token", user: { name: "Gestor Demo", email: body?.email || "demo@trafegoai.com" } };
  }
  if (route === "/auth/me") return { name: "Gestor Demo", email: "demo@trafegoai.com", plan: d.plan };

  // dashboard
  if (route === "/dashboard") return dashboard(period);

  // clients / connections
  if (route === "/clients") return d.clients;
  if (route.match(/^\/clients\/[^/]+\/profile$/) && method === "GET") {
    const profile = clientProfile(route.split("/")[2]);
    if (!profile) throw new Error("Cliente não encontrado");
    return profile;
  }
  if (route === "/connections") {
    // acrescenta o nome do cliente, como faz a API real
    return d.connections.map((c) => ({
      ...c,
      clientName: d.clients.find((cl) => connectionsOfClient(cl, [c]).length)?.name,
    }));
  }
  // Sem backend não há credenciais de plataforma nenhuma: dizemos isso na cara.
  if (route === "/connections/status") {
    const semBackend =
      "Conectar contas de verdade exige a API rodando com as credenciais da plataforma. " +
      "Veja INTEGRACAO_APIS.md.";
    return {
      meta: { configured: false, comoConfigurar: semBackend },
      google: { configured: false, comoConfigurar: semBackend },
      tiktok: { configured: false, comoConfigurar: semBackend },
    };
  }
  if (route.match(/^\/connections\/[^/]+\/authorize$/) && method === "POST") {
    throw new Error(
      "Sem a API configurada não dá para autorizar uma conta real. Suba o backend com as credenciais da plataforma.",
    );
  }
  if (route.match(/^\/connections\/[^/]+\/sync$/) && method === "POST") {
    const id = route.split("/")[2];
    const cn = d.connections.find((c) => c.id === id);
    if (!cn) throw new Error("Conexão não encontrada");
    cn.lastSync = "agora mesmo";
    cn.status = "active";
    logAudit("Sincronizou conta", cn.accountName);
    const camps = d.campaigns.filter(() => true).slice(0, 4);
    return {
      connectionId: cn.id,
      accountName: cn.accountName,
      days: body?.days ?? 30,
      campaigns: camps.length,
      rows: camps.length * 30,
      spend: round(sumMetrics(camps.map((c) => sumMetrics(d.series[c.id].slice(-30)))).spend, 2),
      revenue: round(sumMetrics(camps.map((c) => sumMetrics(d.series[c.id].slice(-30)))).revenue, 2),
    };
  }
  if (route.match(/^\/connections\/[^/]+\/disconnect$/) && method === "POST") {
    const id = route.split("/")[2];
    const cn = d.connections.find((c) => c.id === id);
    if (cn) cn.status = "expired";
    logAudit("Desconectou conta", cn?.accountName || id);
    return { ok: true };
  }

  // campaigns
  if (route === "/campaigns" && method === "GET") return d.campaigns;
  if (route.match(/^\/campaigns\/[^/]+\/adsets$/)) {
    return findAdSets(route.split("/")[2]);
  }
  if (route.match(/^\/adsets\/[^/]+\/ads$/)) {
    return findAds(route.split("/")[2]);
  }
  if (route.match(/^\/campaigns\/[^/]+\/(pause|activate)$/) && method === "POST") {
    const id = route.split("/")[2];
    const c = d.campaigns.find((x) => x.id === id);
    if (c) c.status = route.endsWith("pause") ? "paused" : "active";
    logAudit(route.endsWith("pause") ? "Pausou campanha" : "Ativou campanha", c?.name || id);
    return c;
  }
  if (route.match(/^\/campaigns\/[^/]+\/budget$/) && method === "POST") {
    const id = route.split("/")[2];
    const c = d.campaigns.find((x) => x.id === id);
    if (c) { const old = c.budgetDaily; c.budgetDaily = body.budget; logAudit("Alterou orçamento", `${c.name} (R$ ${old}→R$ ${body.budget})`); }
    return c;
  }
  if (route.match(/^\/campaigns\/[^/]+\/duplicate$/) && method === "POST") {
    const id = route.split("/")[2];
    const c = d.campaigns.find((x) => x.id === id);
    if (c) {
      const copy: Campaign = { ...c, id: `cmp-dup-${Date.now()}`, name: `${c.name} (cópia)`, status: "paused" };
      d.campaigns.push(copy); d.series[copy.id] = d.series[c.id];
      logAudit("Duplicou campanha", c.name);
      return copy;
    }
  }
  if (route.match(/^\/adsets\/[^/]+\/targeting$/) && method === "POST") {
    const id = route.split("/")[2];
    const a = d.adSets.find((x) => x.id === id);
    if (a) { a.targeting = { ...a.targeting, ...body }; logAudit("Editou segmentação", a.name); }
    return a;
  }

  // insights
  if (route === "/insights/diagnosis") {
    const dash = dashboard("30d").summary.current;
    return {
      text: `Nos últimos 30 dias você investiu ${brl(dash.spend)} e gerou ${brl(dash.revenue)} — ROAS de ${dash.roas}. ` +
        `O que vai bem: campanhas de remarketing seguram o ROAS acima da média. O que queima verba: conjuntos de prospecção fria com CPA acima de R$ 60 e criativos com fadiga (frequência > 5). ` +
        `Recomendo realocar verba das piores para as vencedoras e trocar 2 criativos cansados nesta semana.`,
    };
  }
  if (route === "/insights/recommendations" && method === "GET") return d.recommendations.filter((r) => r.status !== "dismissed");
  if (route.match(/^\/insights\/recommendations\/[^/]+\/(apply|dismiss|undo)$/) && method === "POST") {
    const id = route.split("/")[3];
    const r = d.recommendations.find((x) => x.id === id);
    if (r) {
      if (route.endsWith("apply")) { r.status = "applied"; logAudit("Aplicou recomendação", r.title); }
      else if (route.endsWith("dismiss")) r.status = "dismissed";
      else r.status = "open";
    }
    return r;
  }
  if (route === "/insights/anomalies") return d.anomalies;
  if (route === "/insights/creatives") {
    return [...d.ads].sort((a, b) => b.kpi.roas - a.kpi.roas).slice(0, 12);
  }

  // chat
  if (route === "/chat" && method === "POST") {
    const q: string = body.message || "";
    const dash = dashboard("30d").summary.current;
    let answer: string;
    if (/roas|retorno/i.test(q)) answer = `Seu ROAS consolidado é ${dash.roas} nos últimos 30 dias. As campanhas de remarketing puxam a média pra cima; a prospecção fria está abaixo de 2. Sugiro escalar as de ROAS > 4 e revisar as abaixo de 1,5.`;
    else if (/cpa|custo/i.test(q)) answer = `Seu CPA médio está em R$ ${dash.cpa}. O maior ofensor é o conjunto 'Prospecção Fria 3' (R$ 92). Pausar ou trocar o criativo derruba a média.`;
    else if (/criativo|anúncio|fadiga/i.test(q)) answer = `Identifiquei 2 criativos com fadiga (frequência > 5 e CTR em queda). Vale subir variações novas ainda esta semana pra evitar aumento de CPM.`;
    else answer = `Analisando seus dados: investimento ${brl(dash.spend)}, receita ${brl(dash.revenue)}, ROAS ${dash.roas}. Posso detalhar por campanha, sugerir realocação de verba ou gerar criativos novos — é só pedir.`;
    d.chat.push({ role: "user", content: q }, { role: "assistant", content: answer });
    return { reply: answer };
  }

  // rules
  if (route === "/rules" && method === "GET") return d.rules;
  if (route === "/rules" && method === "POST") {
    const rule: Rule = { id: `rl${Date.now()}`, fires: 0, enabled: true, ...body };
    d.rules.push(rule); return rule;
  }
  if (route.match(/^\/rules\/[^/]+$/) && method === "PUT") {
    const id = route.split("/")[2];
    const r = d.rules.find((x) => x.id === id);
    if (r) Object.assign(r, body);
    return r;
  }
  if (route.match(/^\/rules\/[^/]+\/preview$/) && method === "POST") {
    return {
      dryRun: true,
      affected: [
        { name: "Prospecção Fria 3", change: "Pausar (CPA R$ 92 > R$ 60)", withinGuardrails: true },
        { name: "Escala Vencedora 3", change: "Verba R$ 250 → R$ 300 (+20%)", withinGuardrails: true },
        { name: "Catálogo Dinâmico", change: "Verba +40% bloqueada pelo teto de variação (20%)", withinGuardrails: false },
      ],
    };
  }
  if (route.match(/^\/rules\/[^/]+\/run$/) && method === "POST") {
    const id = route.split("/")[2];
    const r = d.rules.find((x) => x.id === id);
    if (r) { r.fires += 1; r.lastRun = "agora mesmo";
      d.notifications.unshift({ id: `n${Date.now()}`, kind: "rule", message: `Regra '${r.name}' disparou em 2 conjuntos.`, at: "agora mesmo", read: false });
      logAudit("Executou regra", r.name);
    }
    return { fired: 2 };
  }

  // goals
  if (route === "/goals") return d.goals;

  // creatives
  if (route === "/creatives" && method === "GET") return d.creatives;
  if (route === "/creatives/generate" && method === "POST") {
    const p: string = body.product || "seu produto";
    const platform: Platform = body.platform || "meta";
    return {
      headlines: [`${p}: resultado que dá pra ver`, `A escolha certa pra ${p}`, `${p} com frete grátis hoje`],
      primaryTexts: [
        `Cansou de tentar sem resultado? ${p} foi feito pra quem quer praticidade e resultado real. Aproveite a oferta.`,
        `Mais de 10 mil clientes já aprovaram ${p}. Descubra por quê — e leve com desconto por tempo limitado.`,
      ],
      descriptions: ["Entrega rápida e garantia de 7 dias.", "Oferta acaba à meia-noite."],
      ctas: ["Comprar agora", "Quero o meu", "Ver oferta"],
      angles: [`Prova social para ${platform}`, "Escassez / urgência", "Antes e depois"],
    };
  }

  // reports
  if (route === "/reports" && method === "GET") return d.reports;
  if (route.match(/^\/reports\/[^/]+$/) && method === "GET") {
    const token = route.split("/")[2];
    const rep = d.reports.find((r) => r.shareToken === token) || d.reports[0];
    const client = d.clients.find((c) => c.id === rep.clientId)!;
    return { report: rep, client, dashboard: dashboard("30d") };
  }

  // billing
  if (route === "/billing/plans") return PLANS;
  if (route === "/billing/checkout" && method === "POST") {
    d.plan = body.plan;
    logAudit("Trocou de plano", PLANS.find((p) => p.id === body.plan)?.name || body.plan);
    return { ok: true, demo: true, plan: d.plan };
  }

  // radar
  if (route === "/radar/products") return trendingProducts();
  if (route === "/radar/videos") return trendingVideos();
  if (route === "/radar/windows") return POSTING_WINDOWS;
  if (route === "/radar/analyze" && method === "POST") return analyzeVideo(body?.description || "");

  // notifications
  if (route === "/notifications" && method === "GET") return d.notifications;
  if (route === "/notifications/read" && method === "POST") {
    d.notifications.forEach((n) => (n.read = true));
    return { ok: true };
  }

  // audit
  if (route === "/audit") return d.audit;

  throw new Error(`Rota mock não encontrada: ${method} ${route}`);
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
