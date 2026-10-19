"use client";

import { useMemo } from "react";
import { Package, AlertTriangle, Archive, History } from "lucide-react";
import { isLowStock } from "@/lib/inventory";
import { useSupplies, useSupplyMovements } from "@/hooks/use-supplies";
import { StatsSkeleton } from "@/components/gestion/skeletons";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function LogisticsStatsBar() {
  const { data: supplies = [], isLoading: suppliesLoading } = useSupplies();
  const { data: movements = [], isLoading: movementsLoading } = useSupplyMovements();

  const stats = useMemo(
    () => ({
      insumos: supplies.length,
      bajoMinimo: supplies.filter((s) => s.is_active && isLowStock(s)).length,
      inactivos: supplies.filter((s) => !s.is_active).length,
      movimientosHoy: movements.filter((m) => isToday(m.created_at)).length,
    }),
    [supplies, movements],
  );

  if (suppliesLoading || movementsLoading) {
    return <StatsSkeleton count={4} minWidth="min-w-36" highlightedIndex={3} />;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
      <StatCard
        icon={<Package size={16} aria-hidden="true" />}
        label="Insumos"
        value={stats.insumos.toString()}
        accent="text-coral"
      />
      <StatCard
        icon={<AlertTriangle size={16} aria-hidden="true" />}
        label="Bajo mínimo"
        value={stats.bajoMinimo.toString()}
        accent="text-amber-600"
        highlightValue={stats.bajoMinimo > 0}
      />
      <StatCard
        icon={<Archive size={16} aria-hidden="true" />}
        label="Inactivos"
        value={stats.inactivos.toString()}
        accent="text-muted-foreground"
      />
      <StatCard
        icon={<History size={16} aria-hidden="true" />}
        label="Movimientos hoy"
        value={stats.movimientosHoy.toString()}
        accent="bg-navy text-white rounded-xl"
        highlighted
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  highlighted,
  highlightValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  highlighted?: boolean;
  highlightValue?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "shrink-0 min-w-36 md:min-w-0 rounded-2xl bg-navy p-3 shadow-sm flex items-center gap-3"
          : "shrink-0 min-w-36 md:min-w-0 rounded-2xl border border-border bg-white p-3 shadow-sm flex items-center gap-3"
      }
    >
      <div
        className={
          highlighted
            ? "flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white shrink-0"
            : "flex items-center justify-center w-9 h-9 rounded-xl bg-muted shrink-0 " + accent
        }
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className={
            highlighted
              ? "text-xs sm:text-[8px] font-bold uppercase tracking-widest text-white/60"
              : "text-xs sm:text-[8px] font-bold uppercase tracking-widest text-muted-foreground"
          }
        >
          {label}
        </span>
        <span
          className={
            highlighted
              ? "font-black text-white text-lg italic leading-tight truncate"
              : highlightValue
                ? "font-black text-amber-600 text-lg italic leading-tight truncate"
                : "font-black text-navy text-lg italic leading-tight truncate"
          }
        >
          {value}
        </span>
      </div>
    </div>
  );
}
