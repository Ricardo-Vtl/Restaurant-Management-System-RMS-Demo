"use client";

import { Armchair, Users, Boxes } from "lucide-react";

export function MesasStatsBar({
  totalLibres,
  totalOcupadas,
  sillasRespaldoActual,
}: {
  totalLibres: number;
  totalOcupadas: number;
  sillasRespaldoActual: number;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
      <StatCard
        icon={<Armchair size={16} aria-hidden="true" />}
        label="Libres"
        value={totalLibres.toString()}
        accent="text-emerald-600"
      />
      <StatCard
        icon={<Users size={16} aria-hidden="true" />}
        label="Ocupadas"
        value={totalOcupadas.toString()}
        accent="text-coral"
      />
      <StatCard
        icon={<Boxes size={16} aria-hidden="true" />}
        label="En respaldo"
        value={sillasRespaldoActual.toString()}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  highlighted?: boolean;
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
              ? "text-xs sm:text-[8px] font-bold uppercase tracking-wide text-white/60"
              : "text-xs sm:text-[8px] font-bold uppercase tracking-wide text-muted-foreground"
          }
        >
          {label}
        </span>
        <span
          className={
            highlighted
              ? "font-black text-white text-lg italic leading-tight truncate"
              : "font-black text-navy text-lg italic leading-tight truncate"
          }
        >
          {value}
        </span>
      </div>
    </div>
  );
}
