"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { StaffUser } from "@/lib/types";

interface AuthState {
  currentUser: StaffUser | null;
  isAuthModalOpen: boolean;
  /** true hasta que AuthProvider termine de restaurar la sesión — evita el flash del gate PIN */
  isHydrating: boolean;
  login: (pin: string) => Promise<string | null>;
  logout: () => Promise<void>;
  setIsAuthModalOpen: (open: boolean) => void;
  setCurrentUser: (user: StaffUser) => void;
  clearCurrentUser: () => void;
  finishHydration: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  isAuthModalOpen: false,
  isHydrating: true,
  login: async (pin: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error al conectar" }));
        return body.error || "Error desconocido";
      }

      const { session, user } = await res.json();

      if (session) {
        await supabase.auth.setSession(session);
      }

      set({
        currentUser: {
          id: user.id,
          name: user.name,
          role: user.role as StaffUser["role"],
          pin: "",
          isActive: user.isActive,
          auth_id: user.auth_id,
        },
        isAuthModalOpen: false,
      });
      return null;
    } catch {
      return "Error de conexión";
    }
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null });
  },
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setCurrentUser: (user) => set({ currentUser: user }),
  clearCurrentUser: () => set({ currentUser: null }),
  finishHydration: () => set({ isHydrating: false }),
}));
