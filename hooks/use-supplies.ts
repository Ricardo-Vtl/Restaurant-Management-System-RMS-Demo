"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { isLowStock, type Supply, type SupplyMovementType } from "@/lib/inventory";
import type {
  SupplyCreateInput,
  SupplyUpdateInput,
  SupplyMovementInput,
  SupplyCountInput,
} from "@/lib/api-schemas";

export interface SupplyMovementRow {
  id: string;
  supply_id: string;
  type: SupplyMovementType;
  quantity: number;
  stock_after: number;
  reason: string | null;
  created_at: string;
  supplies: { name: string; unit: string } | null;
  staff_users: { name: string } | null;
}

export function useSupplies(enabled = true) {
  return useQuery({
    queryKey: ["supplies"],
    queryFn: async (): Promise<Supply[]> => {
      const res = await apiFetch("/api/supplies");
      return res.json();
    },
    staleTime: 30_000,
    enabled,
  });
}

// Contador para el badge del sidebar (comparte caché con la página).
export function useLowStockCount(enabled = true): number {
  const { data } = useSupplies(enabled);
  return (data ?? []).filter((s) => s.is_active && isLowStock(s)).length;
}

export function useSupplyMovements(supplyId?: string) {
  return useQuery({
    queryKey: ["supply-movements", supplyId ?? "all"],
    queryFn: async (): Promise<SupplyMovementRow[]> => {
      const query = supplyId ? `?supply_id=${encodeURIComponent(supplyId)}` : "";
      const res = await apiFetch(`/api/supplies/movements${query}`);
      return res.json();
    },
    staleTime: 15_000,
  });
}

function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["supplies"] });
    void queryClient.invalidateQueries({ queryKey: ["supply-movements"] });
  };
}

export function useCreateSupply() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (input: SupplyCreateInput) => {
      const res = await apiFetch("/api/supplies", { method: "POST", body: JSON.stringify(input) });
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSupply() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (input: SupplyUpdateInput) => {
      const res = await apiFetch("/api/supplies", { method: "PATCH", body: JSON.stringify(input) });
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useSupplyMovement() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (input: SupplyMovementInput) => {
      const res = await apiFetch("/api/supplies/movements", { method: "POST", body: JSON.stringify(input) });
      return res.json() as Promise<{ stock_after: number }>;
    },
    onSuccess: invalidate,
  });
}

export function useSupplyCount() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (input: SupplyCountInput) => {
      const res = await apiFetch("/api/supplies/count", { method: "POST", body: JSON.stringify(input) });
      return res.json() as Promise<{ stock_after: number }>;
    },
    onSuccess: invalidate,
  });
}
