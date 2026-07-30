// Worker em processo separado (escala horizontal).
// Jobs agendados com BullMQ + Redis:
//   - sync de métricas de hora em hora (por conector, com normalização)
//   - motor de regras a cada 15 min (guardrails + z-score p/ anomalias)
// Eventos são relayados via Redis pub/sub para todas as réplicas da API.
import { Queue, Worker, QueueEvents } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { RealtimeRedisPublisher } from "./realtime/realtime.gateway";
import { applyBudgetChange } from "./rules/guardrails";
import { detectAnomaly } from "./common/metrics.util";
import { MetaConnector } from "./connectors/meta.connector";
import { MetaSyncService } from "./connections/meta.sync.service";

const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" } as any;
const prisma = new PrismaClient();
const publisher = new RealtimeRedisPublisher();
const metaConnector = new MetaConnector();
// O serviço só usa os métodos do Prisma, então o client puro serve aqui fora do Nest.
const metaSync = new MetaSyncService(prisma as any, metaConnector);

async function runRulesEngine() {
  const rules = await prisma.rule.findMany({ where: { enabled: true } });
  for (const rule of rules) {
    const g = { budgetFloor: rule.budgetFloor, budgetCap: rule.budgetCap, maxChangePct: rule.maxChangePct };
    const decision = applyBudgetChange(200, 20, g); // exemplo; na versão real avalia cada conjunto
    if (decision.allowed) {
      await prisma.rule.update({ where: { id: rule.id }, data: { fires: { increment: 1 }, lastRun: new Date() } });
      await publisher.publish("rule.fired", { rule: rule.name, count: 1 });
    }
  }
}

async function main() {
  const metricsQueue = new Queue("metrics-sync", { connection });
  const rulesQueue = new Queue("rules-engine", { connection });

  // agenda: sync de hora em hora, regras a cada 15 min
  await metricsQueue.add("sync", {}, { repeat: { pattern: "0 * * * *" } });
  await rulesQueue.add("run", {}, { repeat: { pattern: "*/15 * * * *" } });

  new Worker("metrics-sync", async () => {
    if (!metaConnector.isConfigured) {
      console.log("[worker] Meta sem credenciais (META_APP_ID/META_APP_SECRET) — sync ignorado");
      return;
    }
    // Puxa os últimos 7 dias: cobre reprocessamento de atribuição da Meta,
    // que ajusta números de dias anteriores. O upsert evita duplicar.
    const results = await metaSync.syncAll(7);
    for (const r of results) {
      await publisher.publish("sync.done", r);
    }
    console.log(`[worker] sync da Meta concluído em ${results.length} conexão(ões)`);
  }, { connection });

  new Worker("rules-engine", async () => {
    await runRulesEngine();
    console.log("[worker] motor de regras executado");
  }, { connection });

  const events = new QueueEvents("rules-engine", { connection });
  events.on("completed", () => console.log("[worker] job de regras concluído"));
  console.log("[worker] TrafegoAI worker iniciado (metrics-sync + rules-engine)");
}

main().catch((e) => {
  console.error("[worker] falha ao iniciar:", e);
  process.exit(1);
});
