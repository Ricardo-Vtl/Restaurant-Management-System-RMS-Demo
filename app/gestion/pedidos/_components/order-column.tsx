"use client";

import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderCard } from "./order-card";
import type { Order } from "@/lib/types";

const COLUMN_COLORS: Record<
  "warning" | "info" | "success" | "neutral",
  { bg: string; border: string; text: string; dot: string }
> = {
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400" },
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-400" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400" },
  neutral: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", dot: "bg-slate-400" },
};

interface OrderColumnProps {
  label: string;
  color: "warning" | "info" | "success" | "neutral";
  orders: Order[];
  onSelectOrder: (id: string) => void;
}

export function OrderColumn({ label, color, orders, onSelectOrder }: OrderColumnProps) {
  const colors = COLUMN_COLORS[color];

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-border overflow-hidden shadow-sm h-full">
      <div className={cn("px-4 py-3 border-b shrink-0 flex items-center justify-between", colors.bg, colors.border)}>
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", colors.dot)} aria-hidden="true" />
          <h3 className={cn("text-[11px] font-black uppercase italic tracking-wider", colors.text)}>
            {label}
          </h3>
        </div>
        <span
          className={cn(
            "text-xs sm:text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center",
            colors.bg,
            colors.text,
          )}
        >
          {orders.length}
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2.5">
          {orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} onSelectOrder={onSelectOrder} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 opacity-30">
              <Package size={32} className="mb-2 text-navy" aria-hidden="true" />
              <p className="text-xs sm:text-[9px] font-black uppercase italic tracking-widest text-navy">
                Sin pedidos
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
