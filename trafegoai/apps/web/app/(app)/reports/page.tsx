"use client";
import { FileText, Link2, Printer, Send, Plus } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import type { Report } from "@/lib/types";

export default function ReportsPage() {
  const { data, loading, error, reload } = useFetch<Report[]>(() => api.get("/reports"));
  const { show, node } = useToast();

  const copyLink = (r: Report) => {
    const url = `${window.location.origin}/r/${r.shareToken}`;
    navigator.clipboard?.writeText(url);
    show("Link somente-leitura copiado.");
  };

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="White-label por cliente, agendamento por e-mail, link compartilhável (somente leitura) e export PDF."
        action={<button className="btn-primary"><Plus size={15} /> Novo relatório</button>} />
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface2"><FileText size={18} className="text-brand" /></span>
              <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted">Criado em {r.createdAt}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a className="btn-ghost !py-1.5" href={`/r/${r.shareToken}`} target="_blank" rel="noreferrer"><Link2 size={14} /> Abrir</a>
              <button className="btn-ghost !py-1.5" onClick={() => copyLink(r)}><Link2 size={14} /> Copiar link</button>
              <a className="btn-ghost !py-1.5" href={`/r/${r.shareToken}`} target="_blank" rel="noreferrer"><Printer size={14} /> PDF</a>
              <button className="btn-ghost !py-1.5" onClick={() => show("Relatório enviado por e-mail (agendado).")}><Send size={14} /> Enviar</button>
            </div>
          </div>
        ))}
      </div>
      {node}
    </div>
  );
}
