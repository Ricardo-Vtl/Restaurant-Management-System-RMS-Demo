import type { Order } from "@/lib/types";

export interface DailySummary {
  total: number;
  count: number;
  byMethod: Record<string, number>;
}

// Desglose de cobros por método de pago. Un registro sin `paymentMethod`
// (histórico previo a orders.payment_method) se acredita a "cash" para no
// perder el monto en el total del día.
export function summarizePayments(orders: Order[]): DailySummary {
  const byMethod: Record<string, number> = {};
  let total = 0;
  for (const o of orders) {
    const m = o.paymentMethod ?? "cash";
    byMethod[m] = (byMethod[m] ?? 0) + o.total;
    total += o.total;
  }
  return { total, count: orders.length, byMethod };
}
