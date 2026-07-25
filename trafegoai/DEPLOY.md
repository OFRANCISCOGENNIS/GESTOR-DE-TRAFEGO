# Deploy — visão geral

O TrafegoAI tem **três caminhos de deploy**:

| Caminho | Backend? | Guia |
|---|---|---|
| **Vercel / Netlify (só frontend)** | Não — modo demo no navegador | [`DEPLOY_SEM_BACKEND.md`](./DEPLOY_SEM_BACKEND.md) |
| **Railway** (API + worker + Postgres + Redis) | Sim | [`DEPLOY_RAILWAY.md`](./DEPLOY_RAILWAY.md) |
| **Render** | Sim | este arquivo + [`render.yaml`](./render.yaml) |
| **Local (1 comando)** | Sim | `docker compose up` |

## Render

O [`render.yaml`](./render.yaml) já declara: web service (API), worker, Redis e
Postgres. Basta **New → Blueprint** apontando para o repositório. `JWT_SECRET` e
`ENCRYPTION_KEY` são gerados automaticamente. Após o primeiro deploy, rode o seed
uma vez no shell da API: `npx ts-node prisma/seed.ts`.

Aponte o frontend (`NEXT_PUBLIC_API_URL`) para a URL pública da API.

## Local com Docker (um comando)

```bash
cd trafegoai
docker compose up
# web:  http://localhost:3000
# api:  http://localhost:3333
```

Postgres e Redis sobem juntos; a API roda `migrate deploy` + seed no primeiro boot.
