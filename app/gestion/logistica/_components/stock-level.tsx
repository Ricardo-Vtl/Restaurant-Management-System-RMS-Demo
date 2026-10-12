"use client";

import { cn } from "@/lib/utils";
import { formatQty, isLowStock, type Supply } from "@/lib/inventory";

// Elemento firma del módulo: barra de nivel de stock con marca de mínimo.
export function StockLevel({ supply }: { supply: Pick<Supply, "stock_current" | "stock_min" | "unit"> }) {
  const low = isLowStock(supply);
  const negative = supply.stock_current < 0;
  const max = Math.max(supply.stock_min * 2, supply.stock_current, 1);
  const pct = Math.min(Math.max((supply.stock_current / max) * 100, 0), 100);
  const minPct = supply.stock_min > 0 ? Math.min((supply.stock_min / max) * 100, 100) : null;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Stock: ${formatQty(supply.stock_current)} ${supply.unit}${low ? " (bajo mínimo)" : ""}`}
      >
        <div
          className={cn(
            "h-full rounded-full",
            negative ? "bg-destructive" : low ? "bg-amber-500" : "bg-success",
          )}
          style={{ width: `${pct}%` }}
        />
        {minPct !== null && <span className="absolute inset-y-0 w-px bg-navy/40" style={{ left: `${minPct}%` }} />}
      </div>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          negative && "font-semibold text-destructive",
          low && !negative && "font-semibold text-amber-600",
        )}
      >
        {formatQty(supply.stock_current)} {supply.unit}
      </span>
    </div>
  );
}
