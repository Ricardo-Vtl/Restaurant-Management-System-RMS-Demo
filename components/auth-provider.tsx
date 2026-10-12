"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import type { StaffUser } from "@/lib/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentUser, clearCurrentUser, finishHydration } = useAuthStore(
    useShallow((s) => ({
      setCurrentUser: s.setCurrentUser,
      clearCurrentUser: s.clearCurrentUser,
      finishHydration: s.finishHydration,
    })),
  );

  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: staff } = await supabase
        .from("staff_users")
        .select("id, name, role, is_active, auth_id")
        .eq("auth_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (staff) {
        setCurrentUser({
          id: staff.id,
          name: staff.name,
          role: staff.role as StaffUser["role"],
          pin: "",
          isActive: staff.is_active ?? true,
          auth_id: staff.auth_id,
        });
      }
    };

    restoreSession()
      .catch((err) => console.error("[Auth] Session restore error:", err))
      .finally(finishHydration);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearCurrentUser();
    });

    return () => subscription.unsubscribe();
  }, [setCurrentUser, clearCurrentUser, finishHydration]);

  return children;
}
