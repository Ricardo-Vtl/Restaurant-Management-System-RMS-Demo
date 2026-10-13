import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calcElapsedSince,
  getSlaColor,
  formatElapsed,
  formatCurrency,
  getOrderTimestamp,
  getOrderDurationSeconds,
  DEFAULT_SLA,
} from "@/app/gestion/pedidos/_utils/order-helpers";
import type { Order } from "@/lib/types";

const UUID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

function makeOrder(overrides: Partial<Order> & { id: string }): Order {
  return {
    orderNumber: 1000,
    type: "dine-in",
    status: "pending",
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    paymentStatus: "pending",
    createdAt: new Date("2026-07-25T12:00:00Z"),
    ...overrides,
  };
}

describe("calcElapsedSince", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:10:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns seconds elapsed since a date", () => {
    const since = new Date("2026-07-25T12:05:00Z");
    expect(calcElapsedSince(since)).toBe(300);
  });

  it("returns 0 for current time", () => {
    const now = new Date("2026-07-25T12:10:00Z");
    expect(calcElapsedSince(now)).toBe(0);
  });
});

describe("getSlaColor", () => {
  it("returns green for less than 5 minutes", () => {
    expect(getSlaColor(0)).toBe("green");
    expect(getSlaColor(299)).toBe("green");
  });

  it("returns yellow for 5-15 minutes", () => {
    expect(getSlaColor(300)).toBe("yellow");
    expect(getSlaColor(899)).toBe("yellow");
  });

  it("returns red for more than 15 minutes", () => {
    expect(getSlaColor(900)).toBe("red");
    expect(getSlaColor(1800)).toBe("red");
  });
});

describe("formatElapsed", () => {
  it("formats seconds as MM:SS and rolls over to H:MM:SS", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(59)).toBe("00:59");
    expect(formatElapsed(60)).toBe("01:00");
    expect(formatElapsed(3599)).toBe("59:59");
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3661)).toBe("1:01:01");
  });
});

describe("formatCurrency", () => {
  it("formats numbers as currency", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(100)).toBe("$100.00");
    expect(formatCurrency(1234.56)).toBe("$1234.56");
    expect(formatCurrency(99.9)).toBe("$99.90");
  });

  it("hides float artifacts at boundaries (V9-CAL-07)", () => {
    expect(formatCurrency(0.1 + 0.2)).toBe("$0.30");
  });
});

describe("getOrderTimestamp", () => {
  it("returns createdAt when no other timestamps exist", () => {
    const order = makeOrder({ id: UUID(1), createdAt: new Date("2026-07-25T12:00:00Z") });
    expect(getOrderTimestamp(order)).toEqual(new Date("2026-07-25T12:00:00Z"));
  });

  it("returns the most recent available timestamp", () => {
    const order = makeOrder({
      id: UUID(1),
      createdAt: new Date("2026-07-25T12:00:00Z"),
      acceptedAt: new Date("2026-07-25T12:02:00Z"),
      readyAt: new Date("2026-07-25T12:10:00Z"),
    });
    expect(getOrderTimestamp(order)).toEqual(new Date("2026-07-25T12:10:00Z"));
  });
});

describe("getOrderDurationSeconds", () => {
  it("returns seconds between creation and the last milestone", () => {
    const order = makeOrder({
      id: UUID(1),
      createdAt: new Date("2026-07-25T12:00:00Z"),
      completedAt: new Date("2026-07-25T12:45:00Z"),
    });
    expect(getOrderDurationSeconds(order)).toBe(2700);
  });

  it("is never negative", () => {
    const order = makeOrder({
      id: UUID(1),
      createdAt: new Date("2026-07-25T12:00:00Z"),
      readyAt: new Date("2026-07-25T11:00:00Z"),
    });
    expect(getOrderDurationSeconds(order)).toBe(0);
  });
});

describe("getSlaColor con umbrales de ops", () => {
  it("los defaults son 5 / 15 min (compat con el histórico)", () => {
    expect(DEFAULT_SLA).toEqual({ greenMin: 5, yellowMin: 15 });
    expect(getSlaColor(299)).toBe("green");
    expect(getSlaColor(300)).toBe("yellow");
    expect(getSlaColor(900)).toBe("red");
  });

  it("respeta umbrales personalizados de ops.sla_*", () => {
    const t = { greenMin: 15, yellowMin: 30 };
    expect(getSlaColor(899, t)).toBe("green");
    expect(getSlaColor(900, t)).toBe("yellow");
    expect(getSlaColor(1800, t)).toBe("red");
  });
});
