import { describe, it, expect } from "vitest";
import { orderCheckoutSchema, checkoutSchema } from "@/lib/api-schemas";

const uuid = "4f50bb7b-f97c-4699-b0d0-a5d4d11c8532";

describe("orderCheckoutSchema", () => {
  it("acepta orderId + paymentMethod válidos", () => {
    const r = orderCheckoutSchema.safeParse({ orderId: uuid, paymentMethod: "cash" });
    expect(r.success).toBe(true);
  });

  it("acepta los tres métodos de pago", () => {
    for (const paymentMethod of ["cash", "card", "transfer"] as const) {
      expect(orderCheckoutSchema.safeParse({ orderId: uuid, paymentMethod }).success).toBe(true);
    }
  });

  it("rechaza orderId inválido", () => {
    expect(orderCheckoutSchema.safeParse({ orderId: "no-es-uuid", paymentMethod: "cash" }).success).toBe(false);
  });

  it("rechaza método de pago desconocido", () => {
    expect(orderCheckoutSchema.safeParse({ orderId: uuid, paymentMethod: "crypto" }).success).toBe(false);
  });

  it("rechaza campos extra (strict)", () => {
    expect(orderCheckoutSchema.safeParse({ orderId: uuid, paymentMethod: "cash", tableId: uuid }).success).toBe(false);
  });

  it("no confunde el body de mesa con el de orden", () => {
    const tableBody = { tableId: uuid, paymentMethod: "cash" };
    expect(orderCheckoutSchema.safeParse(tableBody).success).toBe(false);
    expect(checkoutSchema.safeParse(tableBody).success).toBe(true);
    const orderBody = { orderId: uuid, paymentMethod: "cash" };
    expect(checkoutSchema.safeParse(orderBody).success).toBe(false);
    expect(orderCheckoutSchema.safeParse(orderBody).success).toBe(true);
  });
});
