"use client";
import { RefreshCw, PlugZap, Plus } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, StatusBadge, PlatformBadge, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import type { Connection } from "@/lib/types";

export default function ConnectionsPage() {
  const { data, loading, error, reload, setData } = useFetch<Connection[]>(() => api.get("/connections"));
  const { show, node } = useToast();

  const sync = async (c: Connection) => {
    show(`Sincronizando ${c.accountName}...`);
    await api.post(`/connections/${c.id}/sync`);
    setData((prev) => prev ? prev.map((x) => x.id === c.id ? { ...x, status: "active", lastSync: "agora mesmo" } : x) : prev);
    show("Sincronizado.");
  };

  return (
    <div>
      <PageHeader title="Conexões" subtitle="Contas de anúncios conectadas via OAuth. Modo agência com múltiplos clientes."
        action={<button className="btn-primary"><Plus size={15} /> Conectar conta</button>} />
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((c) => (
          <div key={c.id} className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface2"><PlugZap size={18} className="text-brand" /></span>
              <div>
                <p className="font-medium">{c.accountName}</p>
                <div className="mt-1 flex items-center gap-2"><PlatformBadge platform={c.platform} /><StatusBadge status={c.status} /><span className="text-xs text-muted">Última: {c.lastSync}</span></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button className="btn-ghost !py-1.5" onClick={() => sync(c)}><RefreshCw size={14} /> Sincronizar</button>
              {c.status !== "active" && <button className="btn-ghost !py-1.5 text-warn">Reautenticar</button>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Integração OAuth oficial (Google Ads / Meta Marketing / TikTok Marketing) é ponto de integração no backend; sem credenciais, roda em modo demo.</p>
      {node}
    </div>
  );
}
