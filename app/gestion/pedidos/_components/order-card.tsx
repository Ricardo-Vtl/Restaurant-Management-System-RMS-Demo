"use client";

import { Eye, Play, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrderTimer } from "./order-timer";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderSourceBadge } from "./order-source-badge";
import { formatCurrency } from "../_utils/order-helpers";
import { useOrderActions } from "../_hooks/use-order-actions";
import { getNextStatus, canTransition, canRoleTransition } from "@/lib/status-transitions";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import type { Order, UserRole } from "@/lib/types";

interface OrderCardProps {
  order: Order;
  onSelectOrder: (id: string) => void;
  className?: string;
}

function isNewOrder(createdAt: Date): boolean {
  return Date.now() - new Date(createdAt).getTime() < 30_000;
}

export function OrderCard({ order, onSelectOrder, className }: OrderCardProps) {
  const isNew = isNewOrder(order.createdAt);
  const { advance, isLoading } = useOrderActions();
  const role = useAuthStore(useShallow((s) => s.currentUser?.role)) as UserRole | undefined;

  const nextStatus = getNextStatus(order.status, order.type);
  const canAdvance = !!nextStatus &&
    canTransition(order.status, nextStatus) &&
    (!role || canRoleTransition(role, order.status, nextStatus));

  // Count only active items (not delivered/completed)
  const activeItemsCount = order.items.filter((item) =>
    item.status !== "delivered" && item.status !== "completed"
  ).length;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-3 flex flex-col gap-2 shadow-sm transition-all hover:shadow-md",
        isNew && "ring-2 ring-blue-400/60 animate-pulse",
        className,
      )}
    >
      <div className="flex justify-between items-start">
        <span className="font-black text-navy text-sm italic tracking-tighter">
          #{order.orderNumber}
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <OrderSourceBadge type={order.type} />
        <span className="text-[10px] font-bold text-navy truncate min-w-0">
          {order.tableNumber ? `Mesa ${order.tableNumber}` : order.customerInfo?.name ?? "Cliente"}
        </span>
        <OrderTimer order={order} />
      </div>

      <div className="flex justify-between items-center pt-1 border-t border-border/50">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Package size={11} aria-hidden="true" />
          <span className="text-[10px] font-bold">{activeItemsCount} items</span>
        </div>
        <span className="font-black text-navy text-sm italic">
          {formatCurrency(order.total)}
        </span>
      </div>

      <div className="flex justify-end gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectOrder(order.id)}
          className="h-7 rounded-lg text-[9px] font-black uppercase italic text-muted-foreground hover:text-navy px-2.5"
        >
          <Eye size={12} className="mr-1" aria-hidden="true" />
          Ver
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canAdvance || isLoading}
          onClick={() => advance(order)}
          className={cn(
            "h-7 rounded-lg text-[9px] font-black uppercase italic px-2",
            canAdvance
              ? "text-navy hover:text-coral"
              : "text-muted-foreground opacity-40 cursor-not-allowed",
          )}
        >
          <Play size={12} className="mr-1" aria-hidden="true" />
          ▶
        </Button>
      </div>
    </div>
  );
}
