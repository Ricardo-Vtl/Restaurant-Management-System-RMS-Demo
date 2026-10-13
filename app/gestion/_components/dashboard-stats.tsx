"use client";

import { useMemo } from "react";
import { DollarSign, Users, ShoppingBag, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/status-transitions";
import type { Order, Product, Table } from "@/lib/types";

function isToday(date: Date): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function DashboardStats({
  orders,
  tables,
  products,
}: {
  orders: Order[];
  tables: Table[];
  products: Product[];
}) {
  const stats = useMemo(() => {
    const ventasHoy = orders
      .filter((o) => o.status === "completed" && isToday(o.completedAt ?? o.createdAt))
      .reduce((sum, o) => sum + o.total, 0);
    const ocupadas = tables.filter((t) => t.status === "occupied").length;
    const activos = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
    const agotados = products.filter((p) => !p.available).length;
    return { ventasHoy, ocupadas, totalMesas: tables.length, activos, agotados };
  }, [orders, tables, products]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
      <StatCard
        icon={<DollarSign size={16} aria-hidden="true" />}
        label="Ventas hoy"
        value={formatCurrency(stats.ventasHoy)}
        accent="bg-navy text-white rounded-xl"
        highlighted
      />
      <StatCard
        icon={<Users size={16} aria-hidden="true" />}
        label="Mesas"
        value={`${stats.ocupadas} / ${stats.totalMesas}`}
        accent="text-blue-600"
      />
      <StatCard
        icon={<ShoppingBag size={16} aria-hidden="true" />}
        label="Pedidos"
        value={stats.activos.toString()}
        accent="text-amber-600"
      />
      <StatCard
        icon={<AlertTriangle size={16} aria-hidden="true" />}
        label="Agotados"
        value={stats.agotados.toString()}
        accent="text-coral"
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
