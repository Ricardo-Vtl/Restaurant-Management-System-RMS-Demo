"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { KitchenOrderCard } from "./kitchen-order-card";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

interface KitchenQueueProps {
  orders: Order[];
  onAccept: (orderId: string) => void;
}

export function KitchenQueue({ orders, onAccept }: KitchenQueueProps) {
  return (
    <div
      role="region"
      aria-label="Órdenes por aceptar"
      className="flex flex-col bg-white rounded-2xl border border-border overflow-hidden shadow-sm h-full"
    >
      <div className={cn(
        "px-4 py-3 border-b shrink-0 flex items-center justify-between",
        "bg-amber-50 border-amber-200",
      )}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden="true" />
          <h3 className="text-[11px] font-black uppercase italic tracking-wider text-amber-700">
            Por Aceptar
          </h3>
        </div>
        <span className="text-xs sm:text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center bg-amber-50 text-amber-700">
          {orders.length}
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2.5">
          {orders.length > 0 ? (
            orders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                variant="queue"
                onAccept={onAccept}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 opacity-30">
              <Package size={32} className="mb-2 text-navy" aria-hidden="true" />
              <p className="text-xs sm:text-[9px] font-black uppercase italic tracking-widest text-navy">
                Sin ordenes pendientes
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
