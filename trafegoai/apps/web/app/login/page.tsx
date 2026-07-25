"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { api, isDemo } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@trafegoai.com");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await api.post<{ token: string }>(path, { email, password, name });
      localStorage.setItem("trafegoai_token", res.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><TrendingUp size={20} /></span>
          <span className="font-display text-xl font-bold">TrafegoAI</span>
        </Link>
        <div className="card">
          <div className="mb-4 flex gap-2 rounded-xl bg-surface2 p-1">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === m ? "bg-brand text-white" : "text-muted"}`}>
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="label" htmlFor="name">Nome</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-bad">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Entrando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
            <button type="button" className="btn-ghost w-full">Continuar com Google</button>
          </form>

          {isDemo() && (
            <p className="mt-4 rounded-xl bg-brand/10 px-3 py-2 text-center text-xs text-muted">
              Modo demonstração: qualquer credencial entra.<br />Sugestão: <b>demo@trafegoai.com</b> / <b>demo1234</b>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
