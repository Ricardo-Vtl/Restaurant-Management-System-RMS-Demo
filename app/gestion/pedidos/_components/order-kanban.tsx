"use client";

import { useMemo } from "react";
import { OrderColumn } from "./order-column";
import { cn } from "@/lib/utils";
import { useSnapCarousel } from "@/lib/use-snap-carousel";
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

  const { scrollerRef, active, handleScroll, goTo } = useSnapCarousel(ACTIVE_COLUMNS.length);

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Indicador de columnas — solo móvil */}
      <div
        className="flex md:hidden items-center justify-center shrink-0"
        role="group"
        aria-label="Ir a columna"
      >
        {ACTIVE_COLUMNS.map((col, i) => (
          <button
            key={col.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={col.label}
            aria-current={i === active ? "true" : undefined}
            className="group p-2"
          >
            <span
              className={cn(
                "block h-2 rounded-full transition-all",
                i === active
                  ? "w-6 bg-navy"
                  : "w-2 bg-muted-foreground/30 group-hover:bg-muted-foreground/60",
              )}
            />
          </button>
        ))}
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        role="group"
        aria-label="Columnas de pedidos"
        className="flex-1 min-h-0 flex md:grid md:grid-cols-3 md:auto-rows-[minmax(0,1fr)] gap-2 md:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none"
      >
        {ACTIVE_COLUMNS.map((col) => (
          <div key={col.id} className="w-full shrink-0 snap-start snap-always">
            <OrderColumn
              label={col.label}
              color={col.color}
              orders={columnOrders[col.id] ?? []}
              onSelectOrder={onSelectOrder}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
