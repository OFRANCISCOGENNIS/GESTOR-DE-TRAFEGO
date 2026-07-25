# Deploy só do frontend (Vercel / Netlify) — modo demonstração

O TrafegoAI roda **100% no navegador** quando `NEXT_PUBLIC_DEMO_MODE=true`. Todas as
chamadas são atendidas pelo "backend embutido" (`apps/web/lib/mock.ts`), que responde
com dados realistas e muta estado em memória. Não precisa de API, Postgres nem Redis.

## Vercel (recomendado)

1. Importe o repositório na Vercel.
2. **Root Directory**: `apps/web`.
3. A variável `NEXT_PUBLIC_DEMO_MODE=true` já vem do `apps/web/vercel.json`.
4. Deploy. O link público já funciona com login demo.

> Login demo: **demo@trafegoai.com / demo1234** (qualquer credencial entra no modo demo).

## Netlify

1. Base directory: `apps/web`
2. Build command: `next build`
3. Publish directory: `.next`
4. Environment: `NEXT_PUBLIC_DEMO_MODE=true`

## Trocar para o backend real depois

Basta definir `NEXT_PUBLIC_API_URL=https://sua-api...` (e remover/zerar `NEXT_PUBLIC_DEMO_MODE`).
O mesmo `apps/web/lib/api.ts` passa a falar com a API NestJS — nenhum código de tela muda.
