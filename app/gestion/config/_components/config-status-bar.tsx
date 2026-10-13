"use client";

import type { ReactNode } from "react";
import { Store, Percent, ShoppingBag } from "lucide-react";
import { isOpenNow } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { FullConfig } from "../_hooks/use-config";

export function ConfigStatusBar({ config }: { config: FullConfig }) {
  const open = isOpenNow(
    config.schedule as never,
    config.timezone ?? "America/Mexico_City",
    config.closed_until ?? null,
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
          <Store size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-navy italic truncate">{config.name || "Tu restaurante"}</p>
          <p className="text-xs text-muted-foreground truncate">{config.slogan || "Sin lema configurado"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide",
            open ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground",
          )}
        >
          <span
            className={cn("size-2 rounded-full", open ? "bg-emerald-500" : "bg-muted-foreground/50")}
            aria-hidden="true"
          />
          {open ? "Abierto" : "Cerrado"}
        </span>
        <StatusChip on={!!config.tax_enabled} icon={<Percent size={12} aria-hidden="true" />} label="Impuestos" />
        <StatusChip
          on={!!config.web_orders_enabled}
          icon={<ShoppingBag size={12} aria-hidden="true" />}
          label="Pedidos web"
        />
      </div>
    </div>
  );
}

function StatusChip({ on, icon, label }: { on: boolean; icon: ReactNode; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide",
        on ? "bg-navy/5 text-navy" : "bg-muted text-muted-foreground",
      )}
    >
      {icon}
      {label}
      <span className={cn("font-bold", on ? "text-emerald-600" : "text-muted-foreground")}>
        {on ? "ON" : "OFF"}
      </span>
    </span>
  );
}
