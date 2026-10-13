"use client";

import { DollarSign, Banknote, CreditCard, ArrowLeftRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { DailySummary } from "../_utils/daily-summary";

export function CajaStatsBar({ summary }: { summary: DailySummary }) {
  const cash = summary.byMethod.cash ?? 0;
  const card = summary.byMethod.card ?? 0;
  const transfer = summary.byMethod.transfer ?? 0;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
      <StatCard
        icon={<DollarSign size={16} aria-hidden="true" />}
        label="Ventas del día"
        value={formatCurrency(summary.total)}
        accent="bg-navy text-white rounded-xl"
        highlighted
      />
      <StatCard
        icon={<Banknote size={16} aria-hidden="true" />}
        label="Efectivo"
        value={formatCurrency(cash)}
        accent="text-emerald-600"
      />
      <StatCard
        icon={<CreditCard size={16} aria-hidden="true" />}
        label="Tarjeta"
        value={formatCurrency(card)}
        accent="text-blue-600"
      />
      <StatCard
        icon={<ArrowLeftRight size={16} aria-hidden="true" />}
        label="Transferencia"
        value={formatCurrency(transfer)}
        accent="text-violet-600"
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
          ? "shrink-0 min-w-40 md:min-w-0 rounded-2xl bg-navy p-3 shadow-sm flex items-center gap-3"
          : "shrink-0 min-w-40 md:min-w-0 rounded-2xl border border-border bg-white p-3 shadow-sm flex items-center gap-3"
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
              ? "text-xs sm:text-[9px] font-bold uppercase tracking-wide text-white/60"
              : "text-xs sm:text-[9px] font-bold uppercase tracking-wide text-muted-foreground"
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
