"use client";
import { useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, useToast } from "@/components/ui";
import { api, isDemo } from "@/lib/api";
import { formatBRL } from "@/lib/metrics";
import type { Plan, PlanId } from "@/lib/types";

export default function BillingPage() {
  const { data, loading, error, reload } = useFetch<Plan[]>(() => api.get("/billing/plans"));
  const me = useFetch<{ plan: PlanId }>(() => api.get("/auth/me"));
  const [annual, setAnnual] = useState(false);
  const [current, setCurrent] = useState<PlanId | null>(null);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const { show, node } = useToast();

  const activePlan = current ?? me.data?.plan;

  const checkout = async (plan: Plan) => {
    setBusy(plan.id);
    try {
      const res = await api.post<{ demo?: boolean }>("/billing/checkout", { plan: plan.id, annual });
      setCurrent(plan.id);
      show(res.demo ? `Plano ${plan.name} ativado (modo demo).` : "Redirecionando para o checkout...");
    } finally { setBusy(null); }
  };

  return (
    <div>
      <PageHeader title="Planos" subtitle="Starter, Pro e Agência. Anual com 2 meses grátis. Checkout Stripe (modo demo sem chave)."
        action={
          <div className="flex items-center gap-2 rounded-xl bg-surface2 p-1 text-sm">
            <button className={`rounded-lg px-3 py-1.5 ${!annual ? "bg-brand text-white" : "text-muted"}`} onClick={() => setAnnual(false)}>Mensal</button>
            <button className={`rounded-lg px-3 py-1.5 ${annual ? "bg-brand text-white" : "text-muted"}`} onClick={() => setAnnual(true)}>Anual <span className="text-xs">(2 meses grátis)</span></button>
          </div>
        } />
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid gap-4 md:grid-cols-3">
        {data?.map((p) => {
          const price = annual ? p.monthly * 10 : p.monthly;
          const isCurrent = activePlan === p.id;
          return (
            <div key={p.id} className={`card ${p.id === "pro" ? "ring-2 ring-brand" : ""}`}>
              {p.id === "pro" && <span className="badge mb-2 bg-brand text-white">Mais popular</span>}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <p className="mt-2 font-display text-3xl font-bold">{formatBRL(price)}<span className="text-sm font-normal text-muted">/{annual ? "ano" : "mês"}</span></p>
              <ul className="mt-4 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check size={15} className="text-good" /> {f}</li>)}</ul>
              <button className={`mt-5 w-full ${isCurrent ? "btn-ghost" : "btn-primary"}`} disabled={isCurrent || busy === p.id} onClick={() => checkout(p)}>
                <CreditCard size={15} /> {isCurrent ? "Plano atual" : busy === p.id ? "Processando..." : "Assinar"}
              </button>
            </div>
          );
        })}
      </div>
      {isDemo() && <p className="mt-4 text-center text-xs text-muted">Sem chave Stripe, o checkout roda em modo demo e aplica o plano na hora.</p>}
      {node}
    </div>
  );
}
