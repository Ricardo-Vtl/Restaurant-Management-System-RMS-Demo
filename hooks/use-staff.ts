"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import type { StaffCreateInput, StaffUpdateInput } from "@/lib/api-schemas";
import type { UserRole } from "@/lib/types";

export interface StaffMember {
  id: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async (): Promise<StaffMember[]> => {
      const res = await apiFetch("/api/staff");
      return res.json();
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StaffCreateInput) => {
      const res = await apiFetch("/api/staff", { method: "POST", body: JSON.stringify(input) });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StaffUpdateInput) => {
      const res = await apiFetch("/api/staff", { method: "PATCH", body: JSON.stringify(input) });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}
