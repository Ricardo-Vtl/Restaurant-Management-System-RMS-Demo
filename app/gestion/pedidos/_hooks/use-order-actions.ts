"use client";

import { useCallback } from "react";
import { useUpdateOrderStatus, useCancelOrder } from "@/hooks/use-orders";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import { getNextStatus, canTransition, canRoleTransition } from "@/lib/status-transitions";
import { toast } from "sonner";
import type { Order, OrderStatus, UserRole } from "@/lib/types";

export function useOrderActions() {
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const currentUser = useAuthStore(useShallow((s) => s.currentUser));
  const role = currentUser?.role as UserRole | undefined;

  const advance = useCallback(
    async (order: Order) => {
      const next = getNextStatus(order.status, order.type);
      if (!next) {
        toast.error("No hay siguiente estado");
        return;
      }
      if (!canTransition(order.status, next)) {
        toast.error(`Transicion invalida: ${order.status} → ${next}`);
        return;
      }
      if (role && !canRoleTransition(role, order.status, next)) {
        toast.error("No tienes permiso para esta transicion");
        return;
      }
      try {
        await updateStatus.mutateAsync({ id: order.id, status: next as OrderStatus });
        toast.success(`Orden #${order.orderNumber} → ${next}`);
      } catch {
        toast.error("Error al actualizar estado");
      }
    },
    [role, updateStatus],
  );

  const cancel = useCallback(
    async (orderId: string, orderNumber: number, reason: string) => {
      if (role && !canRoleTransition(role, "pending", "cancelled")) {
        toast.error("No tienes permiso para cancelar");
        return;
      }
      try {
        await cancelOrder.mutateAsync({ id: orderId, reason });
        toast.success(`Orden #${orderNumber} cancelada`);
      } catch {
        toast.error("Error al cancelar orden");
      }
    },
    [role, cancelOrder],
  );

  const transition = useCallback(
    async (order: Order, targetStatus: OrderStatus) => {
      if (!canTransition(order.status, targetStatus)) {
        toast.error(`Transicion invalida: ${order.status} → ${targetStatus}`);
        return;
      }
      if (role && !canRoleTransition(role, order.status, targetStatus)) {
        toast.error("No tienes permiso para esta transicion");
        return;
      }
      try {
        await updateStatus.mutateAsync({ id: order.id, status: targetStatus });
        toast.success(`Orden #${order.orderNumber} → ${targetStatus}`);
      } catch {
        toast.error("Error al actualizar estado");
      }
    },
    [role, updateStatus],
  );

  return {
    advance,
    cancel,
    transition,
    isLoading: updateStatus.isPending || cancelOrder.isPending,
  };
}
