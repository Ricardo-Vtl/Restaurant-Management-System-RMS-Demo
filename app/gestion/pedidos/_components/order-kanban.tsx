"use client";

import { useMemo } from "react";
import { OrderColumn } from "./order-column";
import { KANBAN_COLUMNS, ACTIVE_STATUSES } from "@/lib/status-transitions";
import type { Order, OrderStatus } from "@/lib/types";

interface OrderKanbanProps {
  orders: Order[];
  search?: string;
  onSelectOrder: (id: string) => void;
}

const ACTIVE_COLUMNS = KANBAN_COLUMNS.filter((c) => c.id !== "delivered");

export function OrderKanban({ orders, search, onSelectOrder }: OrderKanbanProps) {
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus));
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toString().includes(search) ||
          o.tableNumber?.toLowerCase().includes(s) ||
          o.customerInfo?.name?.toLowerCase().includes(s),
      );
    }
    return result;
  }, [orders, search]);

  const columnOrders = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const col of ACTIVE_COLUMNS) {
      map[col.id] = filteredOrders
        .filter((o) => col.statuses.includes(o.status as OrderStatus))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return map;
  }, [filteredOrders]);

  return (
    <div className="flex md:grid md:grid-cols-3 gap-4 h-full overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none">
      {ACTIVE_COLUMNS.map((col) => (
        <div key={col.id} className="min-w-[280px] md:min-w-0 snap-start">
          <OrderColumn
            label={col.label}
            color={col.color}
            orders={columnOrders[col.id] ?? []}
            onSelectOrder={onSelectOrder}
          />
        </div>
      ))}
    </div>
  );
}
