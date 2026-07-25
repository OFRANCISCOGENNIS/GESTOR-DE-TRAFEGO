// Cliente HTTP único. Em modo demo, roteia p/ o backend embutido (lib/mock.ts).
// Com NEXT_PUBLIC_API_URL definido, fala com a API real (NestJS).
import { mockRequest } from "./mock";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !API_URL;

export function isDemo(): boolean {
  return DEMO;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (DEMO) {
    return mockRequest(method, path, body) as Promise<T>;
  }
  const token = typeof window !== "undefined" ? localStorage.getItem("trafegoai_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Erro ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T,>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T,>(path: string) => request<T>("DELETE", path),
};
