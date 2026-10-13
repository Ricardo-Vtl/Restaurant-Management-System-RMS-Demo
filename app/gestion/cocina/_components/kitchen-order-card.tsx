"use client";

import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OrderTimer } from "../../pedidos/_components/order-timer";
import { OrderSourceBadge } from "../../pedidos/_components/order-source-badge";
import { KitchenItemCard } from "./kitchen-item-card";
import { Package, ChefHat } from "lucide-react";
import type { Order } from "@/lib/types";

interface KitchenOrderCardProps {
  order: Order;
  onMarkItemsReady?: (itemIds: string[]) => void;
  onAccept?: (orderId: string) => void;
  variant?: "queue" | "active";
}

export function KitchenOrderCard({ order, onMarkItemsReady, onAccept, variant = "active" }: KitchenOrderCardProps) {
  const visibleItems = useMemo(
    () => order.items.filter((i) => i.status === "pending" || i.status === "preparing" || i.status === "ready"),
    [order.items],
  );

  const readyCount = useMemo(
    () => visibleItems.filter((i) => i.status === "ready").length,
    [visibleItems],
  );

  const total = visibleItems.length;
  const percent = total > 0 ? (readyCount / total) * 100 : 0;

  const locationLabel = order.tableNumber
    ? `Mesa ${order.tableNumber}`
    : order.customerInfo?.name ?? "Cliente";

  const handleMarkItem = (itemId: string) => {
    onMarkItemsReady?.([itemId]);
  };

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-navy text-lg italic tracking-tighter">
            #{order.orderNumber}
          </span>
          <span className="text-xs font-bold text-muted-foreground truncate">
            {locationLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OrderSourceBadge type={order.type} />
          <OrderTimer order={order} />
        </div>
      </div>

      {variant === "queue" && (
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package size={12} aria-hidden="true" />
              <Badge variant="secondary" className="text-xs sm:text-[10px] font-black">
                {total} items
              </Badge>
            </div>
          </div>
          {onAccept && (
            <Button
              onClick={() => onAccept(order.id)}
              className="w-full min-h-11 rounded-xl font-black uppercase italic text-xs gap-2 bg-navy hover:bg-navy/90 text-white"
              aria-label={`Aceptar orden #${order.orderNumber}`}
            >
              <ChefHat size={16} />
              Aceptar
            </Button>
          )}
        </div>
      )}

      {variant === "active" && (
        <>
          <div className="px-4 py-2 flex items-center gap-3">
            <Progress
              value={percent}
              aria-label={`Progreso de orden #${order.orderNumber}: ${readyCount} de ${total} listos`}
              className="h-2 flex-1"
            />
            <span
              className={cn(
                "text-xs font-black italic tabular-nums",
                percent === 100 ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {readyCount}/{total} listos
            </span>
          </div>

          <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
            {visibleItems.map((item) => (
              <KitchenItemCard
                key={item.id}
                item={item}
                isReady={item.status === "ready"}
                onMarkReady={handleMarkItem}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
