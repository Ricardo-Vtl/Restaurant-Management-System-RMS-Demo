"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { calcElapsedSince, formatElapsed, getSlaColor, getOrderTimestamp, DEFAULT_SLA } from "../_utils/order-helpers";
import { useNow } from "@/lib/now-context";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import type { Order } from "@/lib/types";

interface OrderTimerProps {
  order: Order;
  className?: string;
}

const slaColors = {
  green: "text-emerald-600",
  yellow: "text-amber-500",
  red: "text-red-500 animate-pulse",
} as const;

export function OrderTimer({ order, className }: OrderTimerProps) {
  const now = useNow();
  const { data: config } = useRestaurantConfig();
  const elapsed = calcElapsedSince(getOrderTimestamp(order), now);

  const thresholds = useMemo(
    () => ({
      greenMin: Number(config?.ops?.sla_green_min ?? DEFAULT_SLA.greenMin),
      yellowMin: Number(config?.ops?.sla_yellow_min ?? DEFAULT_SLA.yellowMin),
    }),
    [config?.ops?.sla_green_min, config?.ops?.sla_yellow_min],
  );

  const color = getSlaColor(elapsed, thresholds);

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", slaColors[color], className)}>
      <Clock size={12} aria-hidden="true" />
      {formatElapsed(elapsed)}
    </span>
  );
}
