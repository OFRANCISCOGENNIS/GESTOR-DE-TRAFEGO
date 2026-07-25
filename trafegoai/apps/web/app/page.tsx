import Link from "next/link";
import {
  TrendingUp, Check, BarChart3, Radar, Sparkles, Workflow, ShieldCheck, Zap,
} from "lucide-react";

const FEATURES = [
  { icon: BarChart3, title: "Dashboard unificado", desc: "Google, Meta e TikTok num só painel: ROAS, ROI, CPA, CPC, CTR e conversões, com comparação de período." },
  { icon: Sparkles, title: "Gestor de tráfego virtual (IA)", desc: "Diagnóstico em linguagem simples, recomendações acionáveis com ganho estimado e aplicação em 1 clique." },
  { icon: Workflow, title: "Automações se → então", desc: "Regras rodando em background com preview (dry-run) e guardrails de orçamento. Nada gasta sem sua confirmação." },
  { icon: Radar, title: "Máquina de inteligência", desc: "Produtos e vídeos em alta no mundo + planejador de postagem que analisa seu vídeo antes de publicar." },
];

const STEPS = [
  { n: 1, t: "Conecte suas contas", d: "OAuth oficial para Google, Meta e TikTok. Modo agência com vários clientes." },
  { n: 2, t: "Veja o diagnóstico da IA", d: "Em segundos: o que vai bem, o que queima verba e por quê." },
  { n: 3, t: "Aplique e automatize", d: "Aplique recomendações com 1 clique e crie regras que otimizam sozinhas." },
];

const PLANS = [
  { name: "Starter", price: "R$ 97", features: ["1 cliente", "3 contas conectadas", "Dashboard + IA básica", "Radar de tendências"] },
  { name: "Pro", price: "R$ 197", featured: true, features: ["5 clientes", "Contas ilimitadas", "Automações + regras", "Chat IA + criativos", "Relatórios PDF"] },
  { name: "Agência", price: "R$ 397", features: ["Clientes ilimitados", "White-label + link", "Papéis e permissões", "Suporte prioritário"] },
];

const FAQ = [
  { q: "Preciso conectar minhas contas para testar?", a: "Não. O modo demonstração roda 100% no navegador com dados realistas — explore tudo antes de conectar." },
  { q: "A IA gasta meu dinheiro sozinha?", a: "Nunca. Toda ação que altera campanha ou verba exige sua confirmação e gera log de auditoria. Automações só rodam dentro das regras que você criar." },
  { q: "Funciona para agências?", a: "Sim: múltiplos clientes, relatórios white-label, dashboard compartilhável por link e papéis de acesso." },
  { q: "Quais plataformas são suportadas?", a: "Google Ads, Meta Ads (Facebook/Instagram) e TikTok Ads, com métricas normalizadas num schema comum." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white"><TrendingUp size={18} /></span>
          <span className="font-display text-lg font-bold">TrafegoAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted hover:text-fg">Entrar</Link>
          <Link href="/dashboard" className="btn-primary">Ver demonstração</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center md:pt-20">
        <span className="badge mx-auto bg-brand/15 text-brand">IA + máquina de inteligência de tendências</span>
        <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl">
          Todas as suas campanhas do Google, Meta e TikTok em um só painel — <span className="text-brand">otimizadas por IA</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Diagnóstico automático, recomendações acionáveis, automações com guardrails e o radar de produtos e vídeos em alta no mundo. Tenha as melhores métricas sem virar refém de planilha.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary px-6 py-3 text-base"><Zap size={18} /> Explorar o painel agora</Link>
          <Link href="/login" className="btn-ghost px-6 py-3 text-base">Criar conta grátis</Link>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
          <ShieldCheck size={14} /> LGPD • tokens criptografados (AES-256-GCM) • sem cartão para testar
        </p>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
          {[["ROAS médio", "+38%"], ["CPA", "-27%"], ["Horas/semana", "-9h"], ["Plataformas", "3 em 1"]].map(([k, v]) => (
            <div key={k} className="card">
              <p className="font-display text-3xl font-bold text-brand">{v}</p>
              <p className="mt-1 text-sm text-muted">{k}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-center font-display text-3xl font-bold">Tudo que um gestor de tráfego precisa</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><Icon size={20} /></span>
              <div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-center font-display text-3xl font-bold">Como funciona</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand font-display text-lg font-bold text-white">{s.n}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-center font-display text-3xl font-bold">Planos que cabem no seu momento</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`card ${p.featured ? "ring-2 ring-brand" : ""}`}>
              {p.featured && <span className="badge mb-2 bg-brand text-white">Mais popular</span>}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <p className="mt-2 font-display text-3xl font-bold">{p.price}<span className="text-sm font-normal text-muted">/mês</span></p>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check size={15} className="text-good" /> {f}</li>
                ))}
              </ul>
              <Link href="/billing" className={`mt-5 w-full ${p.featured ? "btn-primary" : "btn-ghost"}`}>Assinar</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="text-center font-display text-3xl font-bold">Perguntas frequentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted md:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white"><TrendingUp size={14} /></span>
            <span className="font-display font-semibold text-fg">TrafegoAI</span>
          </div>
          <p>© 2026 TrafegoAI. Feito para gestores de tráfego pago.</p>
          <Link href="/dashboard" className="hover:text-fg">Ver demonstração →</Link>
        </div>
      </footer>
    </div>
  );
}
