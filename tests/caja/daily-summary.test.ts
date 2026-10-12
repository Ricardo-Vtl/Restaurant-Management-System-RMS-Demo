import { describe, it, expect } from "vitest";
import { dbOrderToDomain, ORDER_SELECT } from "@/lib/transforms/order-transform";
import { summarizePayments } from "@/app/gestion/caja/_utils/daily-summary";

type Row = Parameters<typeof dbOrderToDomain>[0];

function row(overrides: Record<string, unknown> = {}): Row {
  return {
    id: "00000000-0000-0000-0000-0000000000a1",
    order_number: 1,
    table_id: null,
    type: "take-away",
    status: "completed",
    payment_status: "paid",
    payment_method: "cash",
    total: 100,
    created_at: "2026-10-07T12:00:00Z",
    ...overrides,
  } as Row;
}

describe("Resumen del Día — desglose por método de pago", () => {
  it("agrupa por método y acredita a cash lo sin método (fallback)", () => {
    const orders = [
      dbOrderToDomain(row({ payment_method: "card", total: 440 })),
      dbOrderToDomain(row({ payment_method: "cash", total: 100 })),
      dbOrderToDomain(row({ payment_method: null, total: 50 })),
      dbOrderToDomain(row({ payment_method: "transfer", total: 30 })),
    ];
    const s = summarizePayments(orders);
    expect(s.total).toBe(620);
    expect(s.count).toBe(4);
    expect(s.byMethod).toEqual({ card: 440, cash: 150, transfer: 30 });
  });

  it("dbOrderToDomain mapea payment_method del row a paymentMethod", () => {
    expect(dbOrderToDomain(row({ payment_method: "transfer" })).paymentMethod).toBe("transfer");
    expect(dbOrderToDomain(row({ payment_method: null })).paymentMethod).toBeUndefined();
  });

  it("ORDER_SELECT incluye payment_method (regresión: sin él todo caía a cash)", () => {
    expect(ORDER_SELECT).toContain("payment_method");
  });
});
