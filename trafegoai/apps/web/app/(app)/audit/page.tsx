"use client";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, Empty } from "@/components/ui";
import { api } from "@/lib/api";
import type { AuditEntry } from "@/lib/types";

export default function AuditPage() {
  const { data, loading, error, reload } = useFetch<AuditEntry[]>(() => api.get("/audit"));
  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Registro de toda ação sensível: quem, o quê e quando. Exigência de LGPD e governança." />
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="Sem registros ainda" />}
      <div className="card p-0">
        {data?.map((e, i) => (
          <div key={e.id} className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t" : ""}`}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface2"><ScrollText size={15} className="text-brand" /></span>
            <div className="flex-1">
              <p className="text-sm"><b>{e.action}</b> — {e.target}</p>
              <p className="text-xs text-muted">por {e.user}</p>
            </div>
            <span className="text-xs text-muted">{e.at}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
