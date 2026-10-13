"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Info, Droplets, Flame, NotebookPen } from "lucide-react";
import type { OrderItem } from "@/lib/types";

interface KitchenItemCardProps {
  item: OrderItem;
  onMarkReady: (itemId: string) => void;
  isReady: boolean;
}

export function KitchenItemCard({ item, onMarkReady, isReady }: KitchenItemCardProps) {
  const hasModifiers =
    item.modifiers.size ||
    item.modifiers.sauce ||
    item.modifiers.spiceLevel ||
    item.modifiers.extras.length > 0 ||
    item.instructions;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        isReady
          ? "border-emerald-200 bg-emerald-50"
          : "border-border bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg font-black italic text-sm",
              isReady ? "bg-emerald-200 text-emerald-800" : "bg-navy/10 text-navy",
            )}
          >
            {isReady ? <Check size={18} /> : `${item.quantity}x`}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-black italic truncate",
                isReady ? "text-emerald-800 line-through" : "text-navy",
              )}
            >
              {item.name}
            </p>
          </div>
        </div>
      </div>

      {hasModifiers && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.modifiers.size && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700           text-xs sm:text-[10px] font-bold uppercase">
              <Info size={10} />
              {item.modifiers.size.name}
            </span>
          )}
          {item.modifiers.sauce && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-700           text-xs sm:text-[10px] font-bold uppercase">
              <Droplets size={10} />
              {item.modifiers.sauce.name}
            </span>
          )}
          {item.modifiers.spiceLevel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700           text-xs sm:text-[10px] font-bold uppercase">
              <Flame size={10} />
              {item.modifiers.spiceLevel}
            </span>
          )}
          {item.modifiers.extras.map((extra, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700           text-xs sm:text-[10px] font-bold uppercase"
            >
              + {extra.name}
            </span>
          ))}
          {item.instructions && (
            <div className="w-full flex items-start gap-1.5 p-2 rounded-lg bg-navy/5 text-navy text-xs sm:text-[10px]">
              <NotebookPen size={11} className="shrink-0 mt-0.5" />
              <p className="italic">{item.instructions}</p>
            </div>
          )}
        </div>
      )}

      {!isReady && (
        <Button
          onClick={() => onMarkReady(item.id)}
          className="mt-3 w-full min-h-11 rounded-xl font-black uppercase italic text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          aria-label={`Marcar ${item.quantity}x ${item.name} como listo`}
        >
          <Check size={16} />
          Listo
        </Button>
      )}
    </div>
  );
}
