# Deploy no Railway (backend completo)

Sobe API + worker + PostgreSQL + Redis.

## Passos

1. **Crie o projeto** no Railway e adicione os plugins **PostgreSQL** e **Redis**.
2. **Serviço da API**
   - Root: `apps/api` (usa `apps/api/railway.json`).
   - Variáveis: `DATABASE_URL` e `REDIS_URL` (referencie os plugins), `JWT_SECRET`,
     `ENCRYPTION_KEY` (32+ chars), e opcionais `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY`,
     `STRIPE_SECRET_KEY`.
   - Build/migrate já vêm no `railway.json`. Rode o seed uma vez:
     `npx ts-node prisma/seed.ts`.
3. **Serviço do worker** (novo serviço, mesmo repo)
   - Start command: `node dist/worker.main.js`
   - Mesmas `DATABASE_URL` e `REDIS_URL`.
   - Para **escalar horizontalmente**, aumente as réplicas do worker — o relay via
     Redis pub/sub garante que os eventos de tempo real cheguem a todos os clientes.
4. **Frontend**: aponte `NEXT_PUBLIC_API_URL` para a URL pública da API (Vercel ou
   um serviço `web` no próprio Railway).

## Escala dos workers

O `worker.main.ts` usa BullMQ com jobs repetidos (sync de hora em hora, regras a cada
15 min). Rodar N réplicas distribui os jobs; o `RealtimeRedisPublisher` publica os
eventos num canal Redis que a API assina e reemite via WebSocket.
