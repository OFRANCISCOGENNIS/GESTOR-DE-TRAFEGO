"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Search, Pause, Play, Copy, Pencil } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import {
  Loading, ErrorState, useFetch, StatusBadge, PlatformBadge, ConfirmDialog, useToast, Empty,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL, formatNumber } from "@/lib/metrics";
import type { Campaign, AdSet, Ad, Targeting } from "@/lib/types";

type SortKey = "name" | "spend" | "revenue" | "roas" | "cpa" | "ctr";

export default function CampaignsPage() {
  const { data, loading, error, reload, setData } = useFetch<Campaign[]>(() => api.get("/campaigns"));
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "spend", dir: -1 });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; description: string; run: () => void }>(null);
  const [budgetEdit, setBudgetEdit] = useState<null | Campaign>(null);
  const [segEdit, setSegEdit] = useState<null | AdSet>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const { show, node } = useToast();

  const rows = useMemo(() => {
    let r = data ?? [];
    if (platform !== "all") r = r.filter((c) => c.platform === platform);
    if (search) r = r.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    r = [...r].sort((a, b) => {
      const av = sort.key === "name" ? a.name : (a.kpi as any)[sort.key];
      const bv = sort.key === "name" ? b.name : (b.kpi as any)[sort.key];
      return av > bv ? sort.dir : av < bv ? -sort.dir : 0;
    });
    return r;
  }, [data, platform, search, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  const mutate = (id: string, patch: Partial<Campaign>) =>
    setData((prev) => (prev ? prev.map((c) => (c.id === id ? { ...c, ...patch } : c)) : prev));

  const doPauseToggle = (c: Campaign) => {
    const pausing = c.status !== "paused";
    setConfirm({
      title: pausing ? "Pausar campanha?" : "Ativar campanha?",
      description: `${c.name} — esta ação altera a veiculação e será registrada na auditoria.`,
      run: async () => {
        await api.post(`/campaigns/${c.id}/${pausing ? "pause" : "activate"}`);
        mutate(c.id, { status: pausing ? "paused" : "active" });
        show(pausing ? "Campanha pausada." : "Campanha ativada.");
      },
    });
  };
  const doDuplicate = (c: Campaign) => {
    setConfirm({
      title: "Duplicar campanha?", description: `Uma cópia pausada de "${c.name}" será criada.`,
      run: async () => { await api.post(`/campaigns/${c.id}/duplicate`); reload(); show("Campanha duplicada (pausada)."); },
    });
  };

  const exportCsv = () => {
    const header = ["Nome", "Plataforma", "Status", "Gasto", "Receita", "ROAS", "CPA", "CTR", "Conversões"];
    const lines = rows.map((c) => [c.name, c.platform, c.status, c.kpi.spend, c.kpi.revenue, c.kpi.roas, c.kpi.cpa, c.kpi.ctr, c.kpi.conversions].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "campanhas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const compareRows = rows.filter((c) => compare.includes(c.id));

  return (
    <div>
      <PageHeader title="Campanhas" subtitle="Tabela unificada das 3 plataformas. Ordene, filtre, exporte e faça drill-down."
        action={<button className="btn-ghost" onClick={exportCsv}><Download size={15} /> Exportar CSV</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-muted" />
          <input className="input pl-9 md:w-72" placeholder="Buscar campanha..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input md:w-40" value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Filtrar plataforma">
          <option value="all">Todas plataformas</option>
          <option value="google">Google</option>
          <option value="meta">Meta</option>
          <option value="tiktok">TikTok</option>
        </select>
        {compare.length >= 2 && <span className="badge bg-brand/15 text-brand">{compare.length} selecionadas p/ comparar</span>}
      </div>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && rows.length === 0 && <Empty title="Nenhuma campanha encontrada" hint="Ajuste os filtros de busca." />}

      {data && rows.length > 0 && (
        <>
          {compareRows.length >= 2 && <ComparePanel rows={compareRows} onClose={() => setCompare([])} />}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted">
                <tr>
                  <th className="w-8 py-3 pl-4"></th>
                  <th className="w-8"></th>
                  <ThSort label="Campanha" k="name" sort={sort} onClick={toggleSort} />
                  <th className="px-3">Plataforma</th>
                  <th className="px-3">Status</th>
                  <ThSort label="Gasto" k="spend" sort={sort} onClick={toggleSort} right />
                  <ThSort label="Receita" k="revenue" sort={sort} onClick={toggleSort} right />
                  <ThSort label="ROAS" k="roas" sort={sort} onClick={toggleSort} right />
                  <ThSort label="CPA" k="cpa" sort={sort} onClick={toggleSort} right />
                  <ThSort label="CTR" k="ctr" sort={sort} onClick={toggleSort} right />
                  <th className="px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <CampaignRow key={c.id} c={c}
                    expanded={expanded === c.id}
                    onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                    selected={compare.includes(c.id)}
                    onSelect={() => setCompare((s) => s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id])}
                    onPause={() => doPauseToggle(c)}
                    onBudget={() => setBudgetEdit(c)}
                    onDuplicate={() => doDuplicate(c)}
                    onEditSeg={setSegEdit}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog open={!!confirm} title={confirm?.title || ""} description={confirm?.description || ""}
        onConfirm={() => confirm?.run()} onClose={() => setConfirm(null)} />

      {budgetEdit && (
        <BudgetDialog campaign={budgetEdit} onClose={() => setBudgetEdit(null)}
          onSaved={(v) => { mutate(budgetEdit.id, { budgetDaily: v }); show("Orçamento atualizado."); }} />
      )}
      {segEdit && (
        <SegmentDialog adSet={segEdit} onClose={() => setSegEdit(null)} onSaved={() => show("Segmentação atualizada.")} />
      )}
      {node}
    </div>
  );
}

function ThSort({ label, k, sort, onClick, right }: { label: string; k: SortKey; sort: any; onClick: (k: SortKey) => void; right?: boolean }) {
  return (
    <th className={`px-3 ${right ? "text-right" : ""}`}>
      <button className="inline-flex items-center gap-1 hover:text-fg" onClick={() => onClick(k)}>
        {label}{sort.key === k && (sort.dir === -1 ? " ↓" : " ↑")}
      </button>
    </th>
  );
}

function CampaignRow({ c, expanded, onToggle, selected, onSelect, onPause, onBudget, onDuplicate, onEditSeg }: any) {
  return (
    <>
      <tr className="border-b hover:bg-surface2/50">
        <td className="py-3 pl-4">
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Comparar ${c.name}`} />
        </td>
        <td>
          <button onClick={onToggle} aria-label="Expandir">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
        </td>
        <td className="px-3 font-medium">{c.name}</td>
        <td className="px-3"><PlatformBadge platform={c.platform} /></td>
        <td className="px-3"><StatusBadge status={c.status} /></td>
        <td className="px-3 text-right">{formatBRL(c.kpi.spend)}</td>
        <td className="px-3 text-right">{formatBRL(c.kpi.revenue)}</td>
        <td className="px-3 text-right font-semibold">{c.kpi.roas}x</td>
        <td className="px-3 text-right">{formatBRL(c.kpi.cpa)}</td>
        <td className="px-3 text-right">{c.kpi.ctr}%</td>
        <td className="px-3">
          <div className="flex justify-end gap-1">
            <button className="btn-ghost !p-2" title={c.status === "paused" ? "Ativar" : "Pausar"} onClick={onPause}>
              {c.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button className="btn-ghost !p-2" title="Ajustar orçamento" onClick={onBudget}><Pencil size={14} /></button>
            <button className="btn-ghost !p-2" title="Duplicar" onClick={onDuplicate}><Copy size={14} /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={11} className="bg-surface2/30 px-4 py-3">
            <DrillDown campaignId={c.id} onEditSeg={onEditSeg} />
          </td>
        </tr>
      )}
    </>
  );
}

function DrillDown({ campaignId, onEditSeg }: { campaignId: string; onEditSeg: (a: AdSet) => void }) {
  const { data, loading, error, reload } = useFetch<AdSet[]>(() => api.get(`/campaigns/${campaignId}/adsets`));
  if (loading) return <Loading label="Carregando conjuntos..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div className="space-y-2">
      {data?.map((as) => <AdSetBlock key={as.id} adSet={as} onEditSeg={onEditSeg} />)}
    </div>
  );
}

function AdSetBlock({ adSet, onEditSeg }: { adSet: AdSet; onEditSeg: (a: AdSet) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="flex items-center gap-2 font-medium" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {adSet.name}
          <StatusBadge status={adSet.status} />
        </button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>ROAS <b className="text-fg">{adSet.kpi.roas}x</b></span>
          <span>CPA <b className="text-fg">{formatBRL(adSet.kpi.cpa)}</b></span>
          <span>{adSet.targeting.ageMin}-{adSet.targeting.ageMax} • {adSet.targeting.gender} • {adSet.targeting.locations.join(", ")}</span>
          <button className="btn-ghost !px-2 !py-1" onClick={() => onEditSeg(adSet)}><Pencil size={12} /> Segmentação</button>
        </div>
      </div>
      {open && <AdsList adSetId={adSet.id} />}
    </div>
  );
}

function AdsList({ adSetId }: { adSetId: string }) {
  const { data, loading } = useFetch<Ad[]>(() => api.get(`/adsets/${adSetId}/ads`));
  if (loading) return <div className="mt-2"><Loading label="Carregando anúncios..." /></div>;
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      {data?.map((ad) => (
        <div key={ad.id} className="flex items-center gap-3 rounded-lg bg-surface2 p-2 text-sm">
          <span className="text-2xl">{ad.thumbnail}</span>
          <div className="flex-1">
            <p className="font-medium">{ad.name}</p>
            <p className="text-xs text-muted">CTR {ad.kpi.ctr}% • freq. {ad.frequency} • ROAS {ad.kpi.roas}x</p>
          </div>
          {ad.fatigueScore > 60 && <span className="badge bg-bad/15 text-bad">Fadiga {ad.fatigueScore}</span>}
        </div>
      ))}
    </div>
  );
}

function ComparePanel({ rows, onClose }: { rows: Campaign[]; onClose: () => void }) {
  const metrics: { key: keyof Campaign["kpi"]; label: string; better: "high" | "low"; fmt: (n: number) => string }[] = [
    { key: "roas", label: "ROAS", better: "high", fmt: (n) => `${n}x` },
    { key: "cpa", label: "CPA", better: "low", fmt: formatBRL },
    { key: "ctr", label: "CTR", better: "high", fmt: (n) => `${n}%` },
    { key: "revenue", label: "Receita", better: "high", fmt: formatBRL },
    { key: "conversions", label: "Conversões", better: "high", fmt: formatNumber },
  ];
  return (
    <div className="card mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold">Comparação lado a lado</h3>
        <button className="btn-ghost !py-1" onClick={onClose}>Limpar</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-2">Métrica</th>{rows.map((r) => <th key={r.id} className="px-3">{r.name}</th>)}</tr></thead>
          <tbody>
            {metrics.map((m) => {
              const vals = rows.map((r) => r.kpi[m.key] as number);
              const best = m.better === "high" ? Math.max(...vals) : Math.min(...vals);
              return (
                <tr key={m.key} className="border-t">
                  <td className="py-2 text-muted">{m.label}</td>
                  {rows.map((r, i) => (
                    <td key={r.id} className={`px-3 ${vals[i] === best ? "font-bold text-good" : ""}`}>{m.fmt(vals[i])}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetDialog({ campaign, onClose, onSaved }: { campaign: Campaign; onClose: () => void; onSaved: (v: number) => void }) {
  const [value, setValue] = useState(campaign.budgetDaily);
  const [saving, setSaving] = useState(false);
  const delta = ((value - campaign.budgetDaily) / campaign.budgetDaily) * 100;
  const save = async () => {
    setSaving(true);
    await api.post(`/campaigns/${campaign.id}/budget`, { budget: value });
    onSaved(value); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="font-display text-lg font-semibold">Ajustar orçamento diário</h3>
        <p className="mt-1 text-sm text-muted">{campaign.name}</p>
        <label className="label mt-4">Orçamento diário (R$)</label>
        <input type="number" className="input" value={value} onChange={(e) => setValue(Number(e.target.value))} min={0} />
        <p className="mt-2 text-xs text-muted">Variação: <b className={delta >= 0 ? "text-warn" : "text-good"}>{delta.toFixed(0)}%</b> — esta ação gasta dinheiro e gera log de auditoria.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Confirmar alteração"}</button>
        </div>
      </div>
    </div>
  );
}

function SegmentDialog({ adSet, onClose, onSaved }: { adSet: AdSet; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState<Targeting>(adSet.targeting);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    await api.post(`/adsets/${adSet.id}/targeting`, t);
    onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="font-display text-lg font-semibold">Editar segmentação — {adSet.name}</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><label className="label">Idade mínima</label><input type="number" className="input" value={t.ageMin} onChange={(e) => setT({ ...t, ageMin: Number(e.target.value) })} /></div>
          <div><label className="label">Idade máxima</label><input type="number" className="input" value={t.ageMax} onChange={(e) => setT({ ...t, ageMax: Number(e.target.value) })} /></div>
          <div className="col-span-2"><label className="label">Gênero</label>
            <select className="input" value={t.gender} onChange={(e) => setT({ ...t, gender: e.target.value as any })}>
              <option value="all">Todos</option><option value="female">Feminino</option><option value="male">Masculino</option>
            </select>
          </div>
          <div className="col-span-2"><label className="label">Locais (vírgula)</label>
            <input className="input" value={t.locations.join(", ")} onChange={(e) => setT({ ...t, locations: e.target.value.split(",").map((s) => s.trim()) })} /></div>
          <div className="col-span-2"><label className="label">Interesses (vírgula)</label>
            <input className="input" value={t.interests.join(", ")} onChange={(e) => setT({ ...t, interests: e.target.value.split(",").map((s) => s.trim()) })} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar segmentação"}</button>
        </div>
      </div>
    </div>
  );
}
