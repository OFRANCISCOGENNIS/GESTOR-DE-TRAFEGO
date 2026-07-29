# Caminho da integração real — Google Ads, Meta Ads e TikTok Ads

Este guia começa o caminho para o TrafegoAI ler os dados **direto das plataformas**,
sem digitação manual. Está em ordem: o que é de graça, o que você precisa fazer
(só você pode, porque são as suas contas), e o que já está pronto no código.

## As APIs são de graça?

**Sim.** Nenhuma das três cobra pelo uso da API:

| Plataforma | Custo da API | O que exige |
|---|---|---|
| **Google Ads API** | R$ 0 | Conta de administrador (MCC), token de desenvolvedor, aprovação de acesso |
| **Meta Marketing API** | R$ 0 | App no Meta for Developers; em "modo desenvolvimento" já funciona com **suas próprias contas** |
| **TikTok Marketing API** | R$ 0 | Cadastro de desenvolvedor no TikTok for Business e aprovação do app |

O que **não** é de graça é a infraestrutura: para guardar as chaves com segurança e
sincronizar dados é preciso um **servidor** rodando (as chaves secretas não podem
ficar num site estático como o GitHub Pages — qualquer pessoa poderia vê-las).
Há opções gratuitas ou muito baratas para começar (plano free do Render, por exemplo).

## Etapa 1 — Cadastros que só você pode fazer

Faça na ordem. Guarde cada credencial num lugar seguro (nunca no repositório).

### 1a. Meta (Facebook/Instagram) — o mais rápido para começar
1. Acesse https://developers.facebook.com e entre com sua conta.
2. **Criar app** → tipo **Empresa** → dê um nome (ex.: "TrafegoAI").
3. No painel do app, adicione o produto **Marketing API**.
4. Em **Configurações → Básico**, anote o **ID do app** e a **Chave secreta**.
5. Em modo desenvolvimento, o app já consegue ler **as contas de anúncios que
   você administra** — suficiente para começar. (Para ler contas de terceiros
   depois, será preciso a Análise do App + verificação de empresa.)

### 1b. Google Ads
1. Você precisa de uma **conta de administrador** (MCC): https://ads.google.com/home/tools/manager-accounts/
2. Dentro da MCC: **Ferramentas → Central de API** → solicite o **token de
   desenvolvedor**. Ele nasce com acesso de teste; o acesso básico exige um
   formulário e alguns dias de análise do Google.
3. No Google Cloud (https://console.cloud.google.com): crie um projeto, ative a
   **Google Ads API** e crie credenciais **OAuth 2.0** (ID e segredo do cliente).

### 1c. TikTok
1. Acesse https://business-api.tiktok.com e registre-se como desenvolvedor.
2. Crie um app descrevendo o uso ("ler métricas das minhas campanhas") e aguarde
   a aprovação (dias). Anote **App ID** e **Secret**.

## Etapa 2 — O que já está pronto no código

### Meta: implementada de ponta a ponta ✅

O conector da Meta **já está escrito e testado**. Falta apenas você preencher
`META_APP_ID` e `META_APP_SECRET` (etapa 1a) para ele começar a funcionar.

| Arquivo | O que faz |
|---|---|
| `src/connectors/meta.connector.ts` | Cliente real da Graph API: monta a URL de autorização, troca o código por token, converte para token de 60 dias, lista as contas de anúncios e lê as métricas diárias com paginação |
| `src/connectors/meta.normalize.ts` | Converte a resposta da Meta para o schema comum `MetricDaily`. Resolve o detalhe chato dos arrays `actions`/`action_values`, escolhendo o evento de compra **sem contar a mesma venda duas vezes** |
| `src/connectors/meta.normalize.spec.ts` | 8 testes cobrindo campos ausentes, eventos duplicados, valores em texto e arredondamento |
| `src/connections/connections.controller.ts` | Rotas `POST /connections/meta/authorize`, `GET /connections/meta/callback`, `POST /connections/:id/sync` e `GET /connections/status` |
| `src/connections/meta.sync.service.ts` | Grava as métricas no banco com upsert por campanha e dia (pode rodar várias vezes sem duplicar); marca a conexão como expirada quando o token cai |
| `src/worker.main.ts` | Sincroniza sozinho de hora em hora, puxando os últimos 7 dias (a Meta reprocessa atribuição de dias anteriores) |

Segurança já resolvida: os tokens são gravados **criptografados com AES-256-GCM**
(`src/common/crypto.util.ts`), o `state` do OAuth protege contra CSRF, e toda
conexão e sincronização gera registro em `AuditLog`.

### Google e TikTok

Os stubs seguem em `src/connectors/connectors.ts`, no mesmo formato do conector
da Meta — que agora serve de modelo pronto para copiar.

- `prisma/schema.prisma` — tabelas de conexões, campanhas e métricas diárias.
- `.env.example` — lista exata das variáveis a preencher.

## Teste rápido das credenciais (sem servidor nem banco)

Assim que tiver o ID e a chave do app, dá para provar que funciona em um minuto,
sem subir nada:

```bash
cd trafegoai/apps/api
npm install
cp .env.example .env          # preencha META_APP_ID e META_APP_SECRET
npm run meta:doctor
```

O comando confere as credenciais e imprime a URL de autorização. Para ver dados
reais, pegue um token em
[developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
(escolha o seu app e a permissão `ads_read`) e rode:

```bash
npm run meta:doctor -- --token=SEU_TOKEN
```

Ele lista suas contas de anúncios e mostra investimento, receita, ROAS e
conversões dos últimos 7 dias, já convertidos para o formato do painel. Opções:
`--days=30` e `--conta=act_123456`.

Se der erro, a mensagem diz qual é o caso: token expirado, falta de permissão,
limite de chamadas ou bloqueio de rede até `graph.facebook.com`.

## Como ligar a Meta quando você tiver as chaves

```bash
cd trafegoai/apps/api
cp .env.example .env         # preencha META_APP_ID e META_APP_SECRET
npx prisma migrate dev       # cria as tabelas
npm run start:dev            # sobe a API
```

No app da Meta, cadastre a URI de redirecionamento **exatamente** igual à do
`.env` (produto "Login do Facebook" → Configurações → URIs de redirecionamento
válidas), por exemplo `http://localhost:3333/connections/meta/callback`.

Para conferir se está configurado: `GET /connections/status` responde
`{"meta":{"configured":true}}` quando as chaves estão no lugar.

Depois é só chamar `POST /connections/meta/authorize` com o `clientId`, abrir a
`authUrl` devolvida, autorizar, e rodar `POST /connections/:id/sync`.

## Etapa 3 — O que falta

1. ~~Escrever o conector da Meta~~ — **feito** (código, testes e sincronização).
2. **Você criar o app na Meta** (etapa 1a) e me passar `META_APP_ID` e
   `META_APP_SECRET`. Leva cerca de 15 minutos.
3. Subir a API num serviço com plano gratuito (guias prontos:
   `DEPLOY.md`, `DEPLOY_RAILWAY.md`, `render.yaml`), porque a chave secreta não
   pode ficar num site estático.
4. Apontar o frontend para a API (`NEXT_PUBLIC_API_URL`).
5. **Google Ads** quando o token de desenvolvedor for aprovado, e **TikTok**
   quando o app passar pela análise — ambos seguindo o modelo do conector da Meta.

## Resumo honesto

- **Custo das APIs: zero.** Custo de servidor: zero a poucos dólares por mês.
- **O que já funciona:** todo o código da Meta, com 14 testes cobrindo a
  conversão dos dados e a classificação de erros, mais o comando
  `npm run meta:doctor` para você validar as credenciais em um minuto.
- **O que não pude verificar:** a chamada real à `graph.facebook.com`. O ambiente
  onde o código foi escrito bloqueia esse domínio por política de rede, então o
  caminho de rede só será confirmado quando você rodar o `meta:doctor` com um
  token válido. A lógica de conversão e o tratamento de erro estão testados.
- **O que trava hoje:** as credenciais das etapas 1a a 1c. Só você pode criá-las,
  porque exigem seu login e a aceitação dos termos de cada plataforma.
