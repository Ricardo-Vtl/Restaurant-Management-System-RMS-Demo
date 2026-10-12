"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAllOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import type { Order } from "@/lib/types";

export function useKitchenOrders(): { queue: Order[]; active: Order[]; isLoading: boolean } {
  const { data: orders, isLoading } = useAllOrders();

  const result = useMemo(() => {
    const all = orders ?? [];
    const queue = all
      .filter((o) => o.status === "confirmed")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const active = all
      .filter((o) => {
        if (o.status !== "preparing") return false;
        return o.items.some((i) => i.status === "preparing" || i.status === "ready");
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { queue, active };
  }, [orders]);

  return { ...result, isLoading };
}

export function useAcceptOrder() {
  const updateStatus = useUpdateOrderStatus();

  return useMutation({
    mutationFn: async (orderId: string) => {
      await updateStatus.mutateAsync({ id: orderId, status: "preparing" });
    },
    onSuccess: () => {
      toast.success("Orden aceptada");
    },
    onError: () => {
      toast.error("Error al aceptar orden");
    },
  });
}

export function useMarkItemsReady() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { orderId: string; itemIds: string[] }) => {
      const res = await apiFetch("/api/orders/kds-mark-items", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al marcar items");
      }
      return res.json() as Promise<{ orderId: string; allReady: boolean; promotedItems: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data.allReady) {
        toast.success("Orden lista");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
}
