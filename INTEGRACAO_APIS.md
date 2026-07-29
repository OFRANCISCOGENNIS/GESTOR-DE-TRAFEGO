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

O backend em `trafegoai/apps/api` já foi construído esperando essas credenciais:

- `src/connectors/connectors.ts` — conectores de Google/Meta/TikTok com a camada
  de normalização (`MetricDaily`), com os pontos de integração marcados.
- `src/common/crypto.util.ts` — criptografia AES-256-GCM para guardar os tokens
  OAuth em repouso (com testes de ida e volta).
- `prisma/schema.prisma` — tabelas de conexões, campanhas e métricas diárias.
- `src/worker.main.ts` — sincronização agendada (BullMQ) de hora em hora.
- `.env.example` — lista exata das variáveis a preencher.

## Etapa 3 — Ordem sugerida de implementação

1. **Meta primeiro** (funciona em modo desenvolvimento sem análise):
   preencher `META_APP_ID` e `META_APP_SECRET`, implementar o fluxo OAuth em
   `connections` e a leitura de `/{ad_account}/insights` no conector.
2. **Google Ads** assim que o token de desenvolvedor for aprovado.
3. **TikTok** quando o app for aprovado.
4. Subir a API num serviço com plano gratuito (guias prontos:
   `DEPLOY.md`, `DEPLOY_RAILWAY.md`, `render.yaml`).
5. Apontar o frontend para a API (`NEXT_PUBLIC_API_URL`).

## Resumo honesto

- **Custo das APIs: zero.** Custo possível de servidor: zero a poucos dólares/mês.
- **O que trava hoje:** as credenciais das etapas 1a–1c — só você pode criá-las.
- **Quando você tiver o ID e a chave do app da Meta (etapa 1a), me avise:**
  esse é o primeiro conector que dá para ligar de verdade, e o código já está
  esperando por ele.
