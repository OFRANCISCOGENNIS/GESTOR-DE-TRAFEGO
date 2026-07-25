"use client";
import { useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Como está meu ROAS?",
  "Onde estou desperdiçando verba?",
  "Quais criativos estão com fadiga?",
  "O que devo escalar essa semana?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Olá! Sou seu gestor de tráfego virtual. Posso analisar suas contas, sugerir realocação de verba e explicar suas métricas. O que você quer saber?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post<{ reply: string }>("/chat", { message: text });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: "Não consegui responder agora. Tente novamente." }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <PageHeader title="Assistente" subtitle="Chat em português analisando os dados reais das suas contas." />
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-surface p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.role === "user" ? "bg-surface2" : "bg-brand text-white"}`}>
              {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
            </span>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-brand text-white" : "bg-surface2"}`}>{m.content}</div>
          </div>
        ))}
        {loading && <div className="flex gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white"><Bot size={15} /></span><div className="skeleton h-8 w-40" /></div>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => <button key={s} className="btn-ghost !py-1.5 text-xs" onClick={() => send(s)}>{s}</button>)}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input className="input" placeholder="Pergunte sobre suas campanhas..." value={input} onChange={(e) => setInput(e.target.value)} aria-label="Mensagem" />
        <button className="btn-primary" disabled={loading}><Send size={16} /></button>
      </form>
    </div>
  );
}
