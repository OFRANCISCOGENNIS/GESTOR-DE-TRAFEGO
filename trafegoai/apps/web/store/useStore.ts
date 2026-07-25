"use client";
import { create } from "zustand";
import type { Notification } from "@/lib/types";
import { api } from "@/lib/api";

interface AppState {
  theme: "dark" | "light";
  toggleTheme: () => void;
  authed: boolean;
  setAuthed: (v: boolean) => void;
  notifications: Notification[];
  unread: number;
  loadNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  pushLocalNotification: (n: Notification) => void;
}

export const useStore = create<AppState>((set, get) => ({
  theme: "dark",
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", next === "light");
      localStorage.setItem("trafegoai_theme", next);
    }
  },
  authed: false,
  setAuthed: (v) => set({ authed: v }),
  notifications: [],
  unread: 0,
  loadNotifications: async () => {
    try {
      const list = await api.get<Notification[]>("/notifications");
      set({ notifications: list, unread: list.filter((n) => !n.read).length });
    } catch {
      /* silencioso: sino continua vazio */
    }
  },
  markAllRead: async () => {
    await api.post("/notifications/read");
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })), unread: 0 }));
  },
  pushLocalNotification: (n) =>
    set((s) => ({ notifications: [n, ...s.notifications], unread: s.unread + 1 })),
}));
