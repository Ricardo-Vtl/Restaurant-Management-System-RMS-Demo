"use client";

import { useState } from "react";
import type { OrderItem } from "@/lib/types";
import type { Json } from "@/lib/database.types";
import { usePendingOrder, useCreateOrder, useAddItemsToOrder, useInvalidateOrders } from "@/hooks/use-orders";
import { useInvalidateTables } from "@/hooks/use-tables";
import { useAuth } from "@/lib/store";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

interface UseEnviarComandaProps {
  mesaId: string;
  mesaNumber: string;
}

export function useEnviarComanda({ mesaId, mesaNumber }: UseEnviarComandaProps) {
  const { currentUser } = useAuth();
  const { data: activeOrder, isLoading: isOrderLoading } = usePendingOrder(mesaId);
  const createOrder = useCreateOrder();
  const addItems = useAddItemsToOrder();
  const invalidateOrders = useInvalidateOrders();
  const invalidateTables = useInvalidateTables();
  const [isSending, setIsSending] = useState(false);

  const enviarComanda = async (tempCart: OrderItem[]): Promise<boolean> => {
    if (tempCart.length === 0) {
      toast.error("Agrega productos antes de enviar");
      return false;
    }
    if (isSending || isOrderLoading) {
      toast.error("Ya hay un envío en curso");
      return false;
    }

    setIsSending(true);

    try {
      let orderId: string;

      if (!activeOrder) {
        const result = await createOrder.mutateAsync({
          table_id: mesaId,
          type: "dine-in",
          status: "preparing",
          waiter_id: currentUser?.id,
        });
        orderId = result.id as string;
      } else {
        orderId = activeOrder.id;
      }

      await addItems.mutateAsync({
        items: tempCart.map((item) => ({
          order_id: orderId,
          product_id: item.productId,
          quantity: item.quantity,
          modifiers: item.modifiers as unknown as Json,
        })),
      });

      if (activeOrder && (activeOrder.status === "delivered" || activeOrder.status === "completed")) {
        await apiFetch("/api/orders/reopen", {
          method: "POST",
          body: JSON.stringify({ id: orderId }),
        });
      }

      toast.success("¡Comanda enviada a cocina!");
      invalidateOrders(mesaId);

      await apiFetch("/api/tables", {
        method: "PATCH",
        body: JSON.stringify({ filters: { id: mesaId }, updates: { status: "occupied" } }),
      });
      invalidateTables();

      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al procesar la solicitud";
      console.error("[enviarComanda]", error);
      toast.error(msg);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { enviarComanda, isSending, isOrderLoading };
}
