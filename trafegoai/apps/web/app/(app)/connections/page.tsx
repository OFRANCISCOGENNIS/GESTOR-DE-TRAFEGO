"use client";
import { useEffect, useState } from "react";
import {
  RefreshCw, PlugZap, Plus, Check, TriangleAlert, ExternalLink, Unplug, Info,
} from "lucide-react";
import { PageHeader } from "@/components/Shell";
import {
  Loading, ErrorState, useFetch, StatusBadge, PlatformBadge, ConfirmDialog, useToast, Empty,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL, formatNumber } from "@/lib/metrics";
import type { Client, Connection, ConnectionsStatus, Platform, SyncResult } from "@/lib/types";

const PLATFORMS: { id: Platform; name: string; desc: string }[] = [
  { id: "meta", name: "Meta Ads", desc: "Facebook e Instagram" },
  { id: "google", name: "Google Ads", desc: "Busca, Display e YouTube" },
  { id: "tiktok", name: "TikTok Ads", desc: "TikTok for Business" },
];

export default function ConnectionsPage() {
  const conns = useFetch<Connection[]>(() => api.get("/connections"));
  const status = useFetch<ConnectionsStatus>(() => api.get("/connections/status"));
  const clients = useFetch<Client[]>(() => api.get("/clients"));
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [confirm, setConfirm] = useState<null | Connection>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [banner, setBanner] = useState<null | { kind: "ok" | "erro"; text: string }>(null);
  const { show, node } = useToast();

  // O callback do OAuth volta para cá com ?conectado=N ou ?erro=...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ok = q.get("conectado");
    const erro = q.get("erro");
    if (ok) setBanner({ kind: "ok", text: `${ok} conta(s) conectada(s) com sucesso.` });
    else if (erro) {
      const msgs: Record<string, string> = {
        autorizacao_invalida: "A autorização expirou ou foi negada. Tente conectar de novo.",
        sem_contas: "Nenhuma conta de anúncios foi encontrada nesse login.",
      };
      setBanner({ kind: "erro", text: msgs[erro] || decodeURIComponent(erro) });
    }
    if (ok || erro) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const startConnect = async (platform: Platform, clientId: string) => {
    setConnecting(null);
    try {
      const res = await api.post<{ authUrl: string }>(`/connections/${platform}/authorize`, { clientId });
      window.location.href = res.authUrl; // sai para o login da plataforma
    } catch (e: any) {
      setBanner({ kind: "erro", text: e?.message || "Não foi possível iniciar a conexão." });
    }
  };

  const sync = async (c: Connection) => {
    setSyncing(c.id);
    setLastSync(null);
    try {
      const res = await api.post<SyncResult>(`/connections/${c.id}/sync`, { days: 30 });
      setLastSync(res);
      show(`${c.accountName} sincronizada.`);
      conns.reload();
    } catch (e: any) {
      show(e?.message || "Falha ao sincronizar.");
    } finally {
      setSyncing(null);
    }
  };

  const disconnect = async (c: Connection) => {
    await api.post(`/connections/${c.id}/disconnect`);
    show("Conta desconectada.");
    conns.reload();
  };

  const loading = conns.loading || status.loading;

  return (
    <div>
      <PageHeader
        title="Conexões"
        subtitle="Ligue suas contas de anúncios para o painel trabalhar com os seus números."
      />

      {banner && (
        <div
          className={`card mb-4 flex items-start gap-3 ${
            banner.kind === "ok" ? "border-good/40 bg-good/10" : "border-bad/40 bg-bad/10"
          }`}
        >
          {banner.kind === "ok" ? (
            <Check size={18} className="mt-0.5 shrink-0 text-good" />
          ) : (
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" />
          )}
          <p className="text-sm">{banner.text}</p>
          <button className="ml-auto text-xs text-muted hover:text-fg" onClick={() => setBanner(null)}>
            Fechar
          </button>
        </div>
      )}

      {/* Plataformas disponíveis para conectar */}
      <h2 className="mb-2 font-display font-semibold">Plataformas</h2>
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {PLATFORMS.map((p) => {
          const st = status.data?.[p.id];
          const configured = !!st?.configured;
          return (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={p.id} />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{p.desc}</p>
                </div>
                <span className={`badge ${configured ? "bg-good/15 text-good" : "bg-muted/15 text-muted"}`}>
                  {configured ? "Pronta" : "Não configurada"}
                </span>
              </div>

              {configured ? (
                <button
                  className="btn-primary mt-4 w-full"
                  onClick={() => setConnecting(p.id)}
                  disabled={!clients.data?.length}
                >
                  <Plus size={15} /> Conectar conta
                </button>
              ) : (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface2 p-3 text-xs text-muted">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span>{st?.comoConfigurar || "Credenciais da plataforma ainda não configuradas na API."}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Contas já conectadas */}
      <h2 className="mb-2 font-display font-semibold">Contas conectadas</h2>
      {loading && <Loading />}
      {conns.error && <ErrorState error={conns.error} onRetry={conns.reload} />}
      {conns.data && conns.data.length === 0 && (
        <Empty
          title="Nenhuma conta conectada ainda"
          hint="Conecte uma plataforma acima para começar a sincronizar as métricas."
        />
      )}

      {lastSync && (
        <div className="card mb-3 border-good/40 bg-good/10">
          <p className="text-sm">
            <b>{lastSync.accountName}</b>: {formatNumber(lastSync.rows)} registro(s) em{" "}
            {lastSync.campaigns} campanha(s) nos últimos {lastSync.days} dias — investimento{" "}
            {formatBRL(lastSync.spend)} e receita {formatBRL(lastSync.revenue)}.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {conns.data?.map((c) => (
          <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface2">
                <PlugZap size={18} className="text-brand" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{c.accountName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <PlatformBadge platform={c.platform} />
                  <StatusBadge status={c.status} />
                  {c.clientName && <span className="text-xs text-muted">{c.clientName}</span>}
                </div>
                <p className="mt-1 text-xs text-muted">Última sincronização: {formatSync(c.lastSync)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button className="btn-ghost !py-1.5" onClick={() => sync(c)} disabled={syncing === c.id}>
                <RefreshCw size={14} className={syncing === c.id ? "animate-spin" : ""} />
                {syncing === c.id ? "Sincronizando..." : "Sincronizar"}
              </button>
              {c.status === "expired" && (
                <button className="btn-ghost !py-1.5 text-warn" onClick={() => setConnecting(c.platform)}>
                  <ExternalLink size={14} /> Reconectar
                </button>
              )}
              {c.status !== "expired" && (
                <button className="btn-ghost !py-1.5 text-muted" onClick={() => setConfirm(c)}>
                  <Unplug size={14} /> Desconectar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {connecting && (
        <ChooseClientDialog
          platform={connecting}
          clients={clients.data || []}
          onClose={() => setConnecting(null)}
          onPick={(clientId) => startConnect(connecting, clientId)}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Desconectar esta conta?"
        description={`${confirm?.accountName} deixará de sincronizar. As métricas já importadas continuam no painel, e você pode reconectar quando quiser.`}
        confirmLabel="Desconectar"
        onConfirm={() => confirm && disconnect(confirm)}
        onClose={() => setConfirm(null)}
      />
      {node}
    </div>
  );
}

function ChooseClientDialog({
  platform, clients, onClose, onPick,
}: {
  platform: Platform;
  clients: Client[];
  onClose: () => void;
  onPick: (clientId: string) => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const name = PLATFORMS.find((p) => p.id === platform)?.name || platform;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">Conectar {name}</h3>
        <p className="mt-1 text-sm text-muted">
          Escolha para qual cliente as contas encontradas serão vinculadas. Em seguida você entra na sua
          conta e autoriza o acesso de leitura.
        </p>
        <label className="label mt-4" htmlFor="cliente">Cliente</label>
        <select id="cliente" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="mt-3 rounded-xl bg-surface2 p-3 text-xs text-muted">
          Pedimos apenas permissão de <b>leitura</b> das métricas. Nada é alterado nas suas campanhas sem
          a sua confirmação dentro do painel.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onPick(clientId)} disabled={!clientId}>
            Continuar <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// A API real devolve data ISO; o modo demo devolve texto pronto ("há 6 min").
function formatSync(v: string): string {
  if (!v) return "nunca";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
