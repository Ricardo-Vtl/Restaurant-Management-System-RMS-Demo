"use client";

import { useMemo } from "react";
import { Flame, Clock, CheckCircle2, DollarSign } from "lucide-react";
import { ACTIVE_STATUSES } from "@/lib/status-transitions";
import { formatCurrency } from "../_utils/order-helpers";
import type { Order } from "@/lib/types";

interface OrderStatsBarProps {
  orders: Order[];
}

function isToday(date: Date): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export function OrderStatsBar({ orders }: OrderStatsBarProps) {
  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => isToday(new Date(o.createdAt)));
    const active = todayOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    const inKitchen = todayOrders.filter((o) => o.status === "preparing");
    const completed = todayOrders.filter(
      (o) => o.status === "completed" || o.status === "delivered",
    );
    const revenue = todayOrders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + o.total, 0);

    return {
      active: active.length,
      inKitchen: inKitchen.length,
      completed: completed.length,
      revenue,
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<Clock size={16} aria-hidden="true" />}
        label="Activos"
        value={stats.active.toString()}
        accent="text-coral"
      />
      <StatCard
        icon={<Flame size={16} aria-hidden="true" />}
        label="En Cocina"
        value={stats.inKitchen.toString()}
        accent="text-blue-600"
      />
      <StatCard
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
        label="Completados"
        value={stats.completed.toString()}
        accent="text-emerald-600"
      />
      <StatCard
        icon={<DollarSign size={16} aria-hidden="true" />}
        label="Venta del Dia"
        value={formatCurrency(stats.revenue)}
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
          ? "rounded-2xl bg-navy p-3 shadow-sm flex items-center gap-3"
          : "rounded-2xl border border-border bg-white p-3 shadow-sm flex items-center gap-3"
      }
    >
      <div
        className={
          highlighted
            ? "flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white"
            : "flex items-center justify-center w-9 h-9 rounded-xl bg-muted " + accent
        }
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className={
            highlighted
              ? "text-[8px] font-bold uppercase tracking-widest text-white/60"
              : "text-[8px] font-bold uppercase tracking-widest text-muted-foreground"
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
