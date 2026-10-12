"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase";
import {
  dbOrderToDomain,
  dbItemToDomain,
} from "@/lib/transforms/order-transform";
import type { Json } from "@/lib/database.types";
import type { Order, OrderStatus, OrderType } from "@/lib/types";

export interface OrderWithItems {
  id: string;
  order_number: number;
  status: string | null;
  payment_status: string | null;
  total: number | null;
  table_id: string | null;
  type: string | null;
  created_at: string | null;
  order_items: Array<{
    id: string;
    order_id: string | null;
    product_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    modifiers: Json | null;
    status: string | null;
    created_at: string | null;
    products: { name: string } | null;
  }>;
}

interface OrderFilters {
  status?: OrderStatus;
  type?: OrderType;
  dateFrom?: string;
  dateTo?: string;
  completedFrom?: string;
  waiterId?: string;
  tableId?: string;
  paymentStatus?: string;
  search?: string;
}

interface StatusTransitionInput {
  id: string;
  status: OrderStatus;
  cancel_reason?: string;
}

interface CreateOrderInput {
  table_id?: string;
  type: OrderType;
  status?: "pending" | "confirmed" | "preparing";
  waiter_id?: string;
  staff_id?: string;
  customer_info?: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  };
  notes?: string;
}

interface AddItemsInput {
  items: Array<{
    order_id: string;
    product_id: string;
    quantity: number;
    modifiers?: Json;
  }>;
}

function transformOrderRow(
  row: Record<string, unknown>,
  items?: Record<string, unknown>[],
): Order {
  return dbOrderToDomain(
    row as unknown as Parameters<typeof dbOrderToDomain>[0],
    (items as unknown as Parameters<typeof dbItemToDomain>[0][]) ?? undefined,
  );
}

export function useAllOrders(filters?: OrderFilters): UseQueryResult<Order[]> {
  return useQuery({
    queryKey: ["orders", "all", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.type) params.set("type", filters.type);
      if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters?.dateTo) params.set("date_to", filters.dateTo);
      if (filters?.completedFrom) params.set("completed_from", filters.completedFrom);
      if (filters?.waiterId) params.set("waiter_id", filters.waiterId);
      if (filters?.tableId) params.set("table_id", filters.tableId);
      if (filters?.paymentStatus)
        params.set("payment_status", filters.paymentStatus);
      if (filters?.search) params.set("q", filters.search);

      const qs = params.toString();
      const url = qs ? `/api/orders?${qs}` : "/api/orders";
      const res = await apiFetch(url);
      const rows = await res.json();
      return (rows as Record<string, unknown>[]).map((r) =>
        transformOrderRow(
          r,
          r.order_items as Record<string, unknown>[] | undefined,
        ),
      );
    },
    staleTime: 5_000,
  });
}

export function useOrderDetail(orderId: string): UseQueryResult<Order | null> {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    queryFn: async () => {
      const res = await apiFetch(`/api/orders?id=${orderId}`);
      const row = await res.json();
      if (!row || !row.id) return null;
      return transformOrderRow(
        row,
        row.order_items as Record<string, unknown>[] | undefined,
      );
    },
    enabled: !!orderId,
    staleTime: 5_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StatusTransitionInput) => {
      const res = await apiFetch("/api/orders/status", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const res = await apiFetch("/api/orders/status", {
        method: "PATCH",
        body: JSON.stringify({
          id: input.id,
          status: "cancelled",
          cancel_reason: input.reason,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "table"] });
    },
  });
}

export function useOrderCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; paymentMethod: "cash" | "card" | "transfer" } | { tableId: string; paymentMethod: "cash" | "card" | "transfer" }) => {
      const res = await apiFetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "table"] });
    },
  });
}

export function useAddItemsToOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddItemsInput) => {
      const res = await apiFetch("/api/order-items", {
        method: "POST",
        body: JSON.stringify(input.items),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function usePendingOrder(
  tableId: string,
): UseQueryResult<{
  id: string;
  total: number | null;
  order_number: number;
  status: string | null;
} | null> {
  return useQuery({
    queryKey: ["orders", "pending", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, order_number, status")
        .eq("table_id", tableId)
        .eq("payment_status", "pending")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] ?? null;
    },
    staleTime: 2_000,
  });
}

export function useTableOrders(
  tableId: string,
): UseQueryResult<OrderWithItems[]> {
  return useQuery({
    queryKey: ["orders", "table", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items (*, products (name))")
        .eq("table_id", tableId)
        .eq("payment_status", "pending")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2_000,
  });
}

export function useCancelOrderItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemIds: string[] }) => {
      const res = await apiFetch("/api/order-items/cancel", {
        method: "POST",
        body: JSON.stringify({ itemIds: input.itemIds }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "table"] });
    },
  });
}

export function useInvalidateOrders(): (tableId?: string) => void {
  const queryClient = useQueryClient();
  return (tableId?: string) => {
    if (tableId) {
      queryClient.invalidateQueries({ queryKey: ["orders", "table", tableId] });
      queryClient.invalidateQueries({
        queryKey: ["orders", "pending", tableId],
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  };
}
