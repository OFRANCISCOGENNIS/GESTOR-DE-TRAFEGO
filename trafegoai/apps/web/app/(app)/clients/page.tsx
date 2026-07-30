"use client";
import Link from "next/link";
import { ArrowRight, Users, Plus } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Loading, ErrorState, useFetch, Empty } from "@/components/ui";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const { data, loading, error, reload } = useFetch<Client[]>(() => api.get("/clients"));

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Modo agência: escolha um perfil para ver como gerenciá-lo — contas, metas, IA e o guia de gestão."
        action={<button className="btn-primary"><Plus size={15} /> Novo cliente</button>}
      />

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="Nenhum cliente ainda" hint="Adicione o primeiro perfil para começar a gerenciar." />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="card group transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ background: c.logoColor }}>
                <Users size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold">{c.name}</p>
                <p className="text-xs text-muted">Ver como gerenciar este perfil</p>
              </div>
              <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
