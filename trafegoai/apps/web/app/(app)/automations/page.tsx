"use client";
import { useState } from "react";
import { Workflow, Play, Eye, Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import type { Rule } from "@/lib/types";

export default function AutomationsPage() {
  const { data, loading, error, reload, setData } = useFetch<Rule[]>(() => api.get("/rules"));
  const [preview, setPreview] = useState<null | { rule: Rule; result: any }>(null);
  const [creating, setCreating] = useState(false);
  const { show, node } = useToast();

  const toggle = async (r: Rule) => {
    const enabled = !r.enabled;
    setData((prev) => prev ? prev.map((x) => x.id === r.id ? { ...x, enabled } : x) : prev);
    await api.put(`/rules/${r.id}`, { enabled });
  };
  const doPreview = async (r: Rule) => {
    const result = await api.post(`/rules/${r.id}/preview`, {});
    setPreview({ rule: r, result });
  };
  const runNow = async (r: Rule) => {
    const res = await api.post<{ fired: number }>(`/rules/${r.id}/run`, {});
    show(`Regra executada: ${res.fired} conjunto(s) afetado(s).`);
    reload();
  };

  return (
    <div>
      <PageHeader title="Automações" subtitle="Regras se → então rodando em background, com preview (dry-run) e guardrails de orçamento."
        action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={15} /> Nova regra</button>} />

      <div className="card mb-5 flex items-center gap-3 border-good/30 bg-good/5">
        <ShieldCheck className="text-good" size={20} />
        <p className="text-sm text-muted">A IA nunca gasta sozinha. Toda regra tem piso, teto e variação máxima por disparo — e você pode simular antes de ativar.</p>
      </div>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid gap-3">
        {data?.map((r) => (
          <div key={r.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Workflow size={16} className="text-brand" />
                  <span className="font-medium">{r.name}</span>
                  <span className={`badge ${r.enabled ? "bg-good/15 text-good" : "bg-muted/15 text-muted"}`}>{r.enabled ? "Ativa" : "Pausada"}</span>
                </div>
                <p className="mt-2 text-sm"><b className="text-muted">SE</b> {r.condition} <b className="text-muted">ENTÃO</b> {r.action}</p>
                <p className="mt-1 text-xs text-muted">Guardrails: piso R$ {r.budgetFloor} • teto R$ {r.budgetCap} • variação máx. {r.maxChangePct}% • disparos: {r.fires}{r.lastRun ? ` • último: ${r.lastRun}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={r.enabled} onChange={() => toggle(r)} /> Ativa
                </label>
                <button className="btn-ghost" onClick={() => doPreview(r)}><Eye size={14} /> Preview</button>
                <button className="btn-ghost" onClick={() => runNow(r)}><Play size={14} /> Rodar agora</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && <PreviewDialog data={preview} onClose={() => setPreview(null)} />}
      {creating && <CreateRuleDialog onClose={() => setCreating(false)} onCreated={(r) => { setData((p) => p ? [...p, r] : [r]); show("Regra criada."); }} />}
      {node}
    </div>
  );
}

function PreviewDialog({ data, onClose }: { data: { rule: Rule; result: any }; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="font-display text-lg font-semibold">Preview (dry-run) — {data.rule.name}</h3>
        <p className="mt-1 text-sm text-muted">Simulação sem alterar nada. Guardrails aplicados.</p>
        <div className="mt-4 space-y-2">
          {data.result.affected.map((a: any, i: number) => (
            <div key={i} className={`rounded-xl border p-3 text-sm ${a.withinGuardrails ? "" : "border-bad/40 bg-bad/5"}`}>
              <p className="font-medium">{a.name}</p>
              <p className="text-muted">{a.change}</p>
              {!a.withinGuardrails && <p className="mt-1 text-xs text-bad">Bloqueado pelos guardrails de orçamento.</p>}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={onClose}>Entendi</button></div>
      </div>
    </div>
  );
}

function CreateRuleDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (r: Rule) => void }) {
  const [form, setForm] = useState({ name: "", condition: "ROAS > 4 e frequência < 3", action: "Aumentar verba +20%", budgetFloor: 50, budgetCap: 500, maxChangePct: 20 });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const r = await api.post<Rule>("/rules", form);
    onCreated(r); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="font-display text-lg font-semibold">Nova regra de automação</h3>
        <div className="mt-4 space-y-3">
          <div><label className="label">Nome</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Pausar conjunto caro" /></div>
          <div><label className="label">SE (condição)</label><input className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} /></div>
          <div><label className="label">ENTÃO (ação)</label><input className="input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="label">Piso R$</label><input type="number" className="input" value={form.budgetFloor} onChange={(e) => setForm({ ...form, budgetFloor: Number(e.target.value) })} /></div>
            <div><label className="label">Teto R$</label><input type="number" className="input" value={form.budgetCap} onChange={(e) => setForm({ ...form, budgetCap: Number(e.target.value) })} /></div>
            <div><label className="label">Var. máx %</label><input type="number" className="input" value={form.maxChangePct} onChange={(e) => setForm({ ...form, maxChangePct: Number(e.target.value) })} /></div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={saving || !form.name}>{saving ? "Criando..." : "Criar regra"}</button>
        </div>
      </div>
    </div>
  );
}
