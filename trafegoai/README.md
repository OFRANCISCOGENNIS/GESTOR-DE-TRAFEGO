# TrafegoAI — Gestor de tráfego pago com IA + máquina de inteligência de tendências

Um SaaS que reúne **Google Ads, Meta Ads e TikTok Ads** num painel único, com uma
camada de **IA** (diagnóstico, recomendações, chat, criativos, automações) e uma
**máquina de inteligência** que mostra **produtos e vídeos em alta no mundo** e
planeja como/quando postar em cada rede social.

Roda em **dois modos**:

- **Demonstração** — 100% no navegador, sem backend (ideal para publicar só o
  frontend na Vercel/Netlify com um link público).
- **Completo** — frontend Next.js + API NestJS + PostgreSQL + Redis + worker, tudo
  com `docker compose up`.

> **Login demo:** `demo@trafegoai.com` / `demo1234` (no modo demo, qualquer credencial entra).

---

## Início rápido

### Opção A — modo demo (sem backend)

```bash
cd apps/web
npm install
NEXT_PUBLIC_DEMO_MODE=true npm run dev   # http://localhost:3000
```

Todas as telas funcionam: dashboard, campanhas (com drill-down e ações), radar,
planejador, recomendações, automações, chat, criativos, metas, relatórios, etc.

### Opção B — stack completa (um comando)

```bash
docker compose up
# web http://localhost:3000  ·  api http://localhost:3333
```

Sobe Postgres + Redis + API + worker + web. A API roda migrations e seed no primeiro
boot (agência, 3 clientes, 9 conexões, 12 campanhas, 90 dias de métricas).

### Opção C — API à mão

```bash
cd apps/api
npm install
cp .env.example .env            # ajuste DATABASE_URL / REDIS_URL
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run start:dev               # API em :3333
npm run start:worker            # worker (outro terminal)
```

E no frontend, aponte para a API:

```bash
cd apps/web
NEXT_PUBLIC_API_URL=http://localhost:3333 npm run dev
```

---

## Arquitetura

```
apps/web (Next.js 14)  ──HTTP/WS──▶  apps/api (NestJS)
   │                                     │
   │ modo demo: lib/mock.ts              ├── PostgreSQL (Prisma + migrations)
   │ (backend no navegador)              ├── Redis ◀── worker (BullMQ): sync + regras
   ▼                                     └── Conectores Google/Meta/TikTok
Vercel/Netlify (sem backend)                 + camada de normalização (MetricDaily)
```

- **Frontend:** Next.js 14 (App Router), React, TypeScript, TailwindCSS, Zustand,
  Recharts, TanStack Table.
- **Backend:** NestJS + Prisma; WebSockets (Socket.IO) com relay via Redis pub/sub;
  jobs com BullMQ (sync de hora em hora, motor de regras a cada 15 min); worker em
  processo separado (escala horizontal).
- **Banco:** PostgreSQL. Métricas normalizadas no schema comum `MetricDaily` em nível
  de conta/campanha/conjunto/anúncio. ROAS/ROI/CPA/CPC/CPM/CTR/tx. conversão são
  **derivadas na leitura** (`apps/api/src/common/metrics.util.ts`).
- **IA:** `LlmService` usa Claude quando há `ANTHROPIC_API_KEY`, com **fallback
  heurístico** sem chave. Detecção de anomalias por **z-score**.
- **Segurança/LGPD:** tokens OAuth criptografados em repouso (**AES-256-GCM**,
  `crypto.util.ts`); dados sensíveis nunca em URL; toda ação que altera campanha/verba
  exige confirmação e gera `AuditLog`; a IA nunca gasta sozinha fora das regras que
  você criar.

---

## O modo demonstração (backend embutido no navegador)

`apps/web/lib/mock.ts` implementa um roteador que responde a **todas** as rotas da API
com dados realistas e muta estado em memória (pausar campanha, aplicar recomendação,
trocar plano, editar segmentação, rodar regra, etc.). O `apps/web/lib/api.ts` decide,
em tempo de execução, entre o mock e a API real:

```ts
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_API_URL;
```

Trocar de demo para real é só definir `NEXT_PUBLIC_API_URL` — nenhum código de tela muda.

---

## Registrar os apps de desenvolvedor (credenciais reais)

O app funciona com dados mockados enquanto o acesso às APIs não é liberado. Para ligar
as integrações reais, registre os apps e preencha o `.env` da API:

| Plataforma | Onde registrar | O que obter |
|---|---|---|
| **Google Ads** | [API Center](https://developers.google.com/google-ads/api) + Google Cloud OAuth | Developer token, Client ID/Secret, refresh token |
| **Meta Ads** | [Meta for Developers](https://developers.facebook.com/) → app Business | App ID/Secret, access token, ad account id |
| **TikTok Ads** | [TikTok for Business API](https://business-api.tiktok.com/) | App ID/Secret, access token, advertiser id |
| **YouTube (radar)** | [Google Cloud → YouTube Data API v3](https://developers.google.com/youtube/v3) | `YOUTUBE_API_KEY` |
| **IA** | [Anthropic Console](https://console.anthropic.com/) | `ANTHROPIC_API_KEY` |
| **Billing** | [Stripe](https://dashboard.stripe.com/) | `STRIPE_SECRET_KEY` + webhook |

Os pontos de integração estão marcados no código (`apps/api/src/connectors/connectors.ts`,
`radar/youtube.ts`, `common/llm.service.ts`, `misc.controllers.ts`) com `TODO(integração)`.

---

## Escalar os workers

O `worker.main.ts` roda os jobs repetidos com BullMQ. Para escalar horizontalmente,
suba N réplicas do worker — o `RealtimeRedisPublisher` publica eventos num canal Redis
que a API assina e reemite via WebSocket, então o tempo real funciona com múltiplas
réplicas de API e worker. Veja [`DEPLOY_RAILWAY.md`](./DEPLOY_RAILWAY.md).

---

## Testes

Suíte Jest para as funções puras críticas:

```bash
cd apps/api && npm test
```

- **Métricas derivadas** — ROAS/CPA/CPC/CPM/CTR e proteção contra divisão por zero, z-score.
- **Criptografia de tokens** — round-trip AES-256-GCM, IV aleatório, falha em adulteração.
- **Guardrails de orçamento** — piso, teto e variação máxima por disparo.

`19 testes, todos verdes.`

---

## Estrutura

```
trafegoai/
├─ apps/
│  ├─ web/                 # Next.js 14 (landing, login, 14 páginas de painel, /r/[token])
│  │  ├─ app/              # App Router
│  │  ├─ components/       # Shell, UI (estados, KPI, badges, confirmação)
│  │  ├─ lib/              # api.ts, mock.ts (backend no navegador), metrics.ts, types.ts
│  │  └─ store/            # Zustand (tema, notificações)
│  └─ api/                 # NestJS + Prisma
│     ├─ prisma/           # schema.prisma + seed.ts
│     └─ src/
│        ├─ common/        # metrics.util, crypto.util, llm.service (+ specs)
│        ├─ connectors/    # Google/Meta/TikTok + normalização (MetricDaily)
│        ├─ radar/         # YouTube Data API v3 (real)
│        ├─ rules/         # guardrails (+ spec)
│        ├─ realtime/      # WebSocket + relay Redis pub/sub
│        └─ *.controllers  # dashboard, campaigns, insights, rules, radar, auth, misc
├─ docker-compose.yml      # stack completa em um comando
├─ render.yaml             # deploy Render
├─ DEPLOY*.md              # guias (Vercel sem backend, Railway, Render, local)
└─ README.md
```

## Funcionalidades

- **Dashboard unificado**: 12 KPIs, comparação vs. período anterior, evolução
  gasto×receita, funil, verba por plataforma, mapa de calor, cards de destaque, alertas.
- **Campanhas**: tabela das 3 plataformas com busca/ordenação/CSV, ações com
  confirmação (pausar/ativar/verba/duplicar), drill-down conjuntos→anúncios,
  comparação lado a lado, edição de segmentação, detecção de fadiga.
- **IA**: diagnóstico, recomendações priorizadas com aplicar/desfazer, chat em pt-BR,
  anomalias por z-score.
- **Automações**: regras se→então com preview (dry-run) e guardrails de orçamento.
- **Radar + Planejador**: produtos e vídeos em alta (YouTube real), janelas de postagem
  e "analisar meu vídeo antes de postar".
- **Metas & previsões**, **gerador de criativos**, **relatórios white-label** (link
  compartilhável + PDF), **conexões**, **auditoria**, **planos** (Stripe / demo).
