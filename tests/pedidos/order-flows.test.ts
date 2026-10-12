import { describe, it, expect } from "vitest";
import { canTransition, canRoleTransition, getNextStatus } from "@/lib/status-transitions";
import { orderSchema, orderItemSchema } from "@/lib/api-schemas";
import type { OrderStatus, OrderType, UserRole } from "@/lib/types";

type Step = { from: OrderStatus; to: OrderStatus; role: UserRole };

const TABLE = "00000000-0000-0000-0000-000000000001";
const CUSTOMER = { name: "Ana", phone: "5512345678" };

function walk(type: OrderType, start: OrderStatus, steps: Step[]): OrderStatus {
  let current = start;
  for (const step of steps) {
    expect(current).toBe(step.from);
    expect(canTransition(step.from, step.to)).toBe(true);
    expect(canRoleTransition(step.role, step.from, step.to)).toBe(true);
    expect(getNextStatus(step.from, type)).toBe(step.to);
    current = step.to;
  }
  return current;
}

const KITCHEN_THEN_HANDOFF: Step[] = [
  { from: "confirmed", to: "preparing", role: "kitchen" },
  { from: "preparing", to: "ready", role: "kitchen" },
];

describe("F7 dine-in (mesas → cocina → entrega → checkout)", () => {
  it("parte en preparing y cierra preparing → ready → delivered → completed", () => {
    const end = walk("dine-in", "preparing", [
      { from: "preparing", to: "ready", role: "kitchen" },
      { from: "ready", to: "delivered", role: "waiter" },
      { from: "delivered", to: "completed", role: "cashier" },
    ]);
    expect(end).toBe("completed");
    expect(getNextStatus("completed", "dine-in")).toBeNull();
  });
});

describe("F7 delivery (web / teléfono)", () => {
  it("parte en pending y pasa por on-the-way", () => {
    const end = walk("delivery", "pending", [
      { from: "pending", to: "confirmed", role: "cashier" },
      ...KITCHEN_THEN_HANDOFF,
      { from: "ready", to: "on-the-way", role: "cashier" },
      { from: "on-the-way", to: "delivered", role: "cashier" },
      { from: "delivered", to: "completed", role: "cashier" },
    ]);
    expect(end).toBe("completed");
  });
});

describe("F7 pickup / take-away (web / walk-in / teléfono)", () => {
  it.each(["pickup", "take-away"] as const)(
    "%s: pending → confirmed → preparing → ready → delivered → completed",
    (type) => {
      const end = walk(type, "pending", [
        { from: "pending", to: "confirmed", role: "cashier" },
        ...KITCHEN_THEN_HANDOFF,
        { from: "ready", to: "delivered", role: "cashier" },
        { from: "delivered", to: "completed", role: "cashier" },
      ]);
      expect(end).toBe("completed");
    },
  );
});

describe("F7 saltos y reopen", () => {
  it("bloquea saltos del flujo", () => {
    expect(canTransition("pending", "preparing")).toBe(false);
    expect(canTransition("pending", "ready")).toBe(false);
    expect(canTransition("confirmed", "delivered")).toBe(false);
    expect(canTransition("preparing", "completed")).toBe(false);
  });

  it("reopen no es transición: delivered → preparing va por RPC", () => {
    expect(canTransition("delivered", "preparing")).toBe(false);
    expect(canTransition("completed", "preparing")).toBe(false);
  });
});

describe("F7 roles en las cadenas vivas", () => {
  it("waiter no confirma ni cocina", () => {
    expect(canRoleTransition("waiter", "pending", "confirmed")).toBe(false);
    expect(canRoleTransition("waiter", "confirmed", "preparing")).toBe(false);
    expect(canRoleTransition("waiter", "preparing", "ready")).toBe(false);
  });

  it("kitchen no entrega ni cancela", () => {
    expect(canRoleTransition("kitchen", "ready", "delivered")).toBe(false);
    expect(canRoleTransition("kitchen", "ready", "on-the-way")).toBe(false);
    expect(canRoleTransition("kitchen", "preparing", "cancelled")).toBe(false);
  });

  it("waiter no cancela ni completa (checkout es caja)", () => {
    expect(canRoleTransition("waiter", "preparing", "cancelled")).toBe(false);
    expect(canRoleTransition("waiter", "delivered", "completed")).toBe(false);
  });
});

describe("F7 clamp de creación", () => {
  it("dine-in acepta preparing con mesa", () => {
    expect(orderSchema.safeParse({ type: "dine-in", table_id: TABLE, status: "preparing" }).success).toBe(true);
  });

  it("staff pickup/take-away nace confirmed (cola de cocina sin confirmar caja)", () => {
    expect(orderSchema.safeParse({ type: "pickup", status: "confirmed" }).success).toBe(true);
    expect(orderSchema.safeParse({ type: "take-away", status: "confirmed" }).success).toBe(true);
  });

  it("delivery exige cliente", () => {
    expect(orderSchema.safeParse({ type: "delivery", status: "pending" }).success).toBe(false);
    expect(orderSchema.safeParse({ type: "delivery", status: "pending", customer_info: CUSTOMER }).success).toBe(true);
  });

  it("rechaza status fuera de pending|confirmed|preparing", () => {
    expect(orderSchema.safeParse({ type: "pickup", status: "ready" }).success).toBe(false);
  });

  it("dine-in exige mesa", () => {
    expect(orderSchema.safeParse({ type: "dine-in", status: "preparing" }).success).toBe(false);
  });
});

describe("F7 regresión: orderItemSchema modifiers (product-modal splat)", () => {
  const ITEM = { order_id: TABLE, product_id: TABLE, quantity: 1 };
  const CUSTOM = {
    size: { id: "s1", name: "Grande", price: 0 },
    sauce: { id: "sa1", name: "Mango", price: 0 },
    spiceLevel: "Muy picante",
    extras: [{ id: "e1", name: "Queso", price: 20 }],
    specialInstructions: "sin cebolla",
  };

  it("acepta personalizaciones completas", () => {
    expect(orderItemSchema.safeParse({ ...ITEM, modifiers: CUSTOM }).success).toBe(true);
  });

  it("rechaza el splat histórico (claves top-level id/name/price)", () => {
    const splat = { ...CUSTOM, id: "s1", name: "Grande", price: 240 };
    expect(orderItemSchema.safeParse({ ...ITEM, modifiers: splat }).success).toBe(false);
  });

  it("extras es obligatorio dentro de modifiers", () => {
    const { extras, ...sinExtras } = CUSTOM;
    expect(orderItemSchema.safeParse({ ...ITEM, modifiers: sinExtras }).success).toBe(false);
  });

  it("acepta modifiers nulos/ausentes (producto simple)", () => {
    expect(orderItemSchema.safeParse({ ...ITEM }).success).toBe(true);
    expect(orderItemSchema.safeParse({ ...ITEM, modifiers: null }).success).toBe(true);
  });
});
