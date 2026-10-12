import type { Order } from "@/lib/types";

export { formatCurrency } from "@/lib/format";

export function calcElapsedSince(since: Date, now: number = Date.now()): number {
  return Math.floor((now - new Date(since).getTime()) / 1000);
}

export type SlaColor = "green" | "yellow" | "red";

export interface SlaThresholds {
  greenMin: number;
  yellowMin: number;
}

// Defaults = umbrales históricos (5 / 15 min); el POS los lee de ops.sla_*.
export const DEFAULT_SLA: SlaThresholds = { greenMin: 5, yellowMin: 15 };

export function getSlaColor(elapsedSeconds: number, thresholds: SlaThresholds = DEFAULT_SLA): SlaColor {
  if (elapsedSeconds < thresholds.greenMin * 60) return "green";
  if (elapsedSeconds < thresholds.yellowMin * 60) return "yellow";
  return "red";
}

export function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getOrderTimestamp(order: Order): Date {
  const candidates = [order.acceptedAt, order.readyAt, order.completedAt, order.cancelledAt, order.createdAt].filter(
    (t): t is Date => !!t,
  );
  return candidates.sort((a, b) => b.getTime() - a.getTime())[0] ?? order.createdAt;
}
