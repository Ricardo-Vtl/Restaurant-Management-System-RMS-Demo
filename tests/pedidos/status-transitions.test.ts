import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  getNextStatus,
  canTransition,
  KANBAN_COLUMNS,
  ACTIVE_STATUSES,
  buildDefaultWindowOr,
} from "@/lib/status-transitions";

describe("STATUS_TRANSITIONS", () => {
  it("pending can go to confirmed or cancelled", () => {
    expect(STATUS_TRANSITIONS.pending).toContain("confirmed");
    expect(STATUS_TRANSITIONS.pending).toContain("cancelled");
  });

  it("completed and cancelled are terminal states", () => {
    expect(STATUS_TRANSITIONS.completed).toHaveLength(0);
    expect(STATUS_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it("ready can go to delivered, on-the-way, or cancelled", () => {
    expect(STATUS_TRANSITIONS.ready).toContain("delivered");
    expect(STATUS_TRANSITIONS.ready).toContain("on-the-way");
    expect(STATUS_TRANSITIONS.ready).toContain("cancelled");
  });
});

describe("getNextStatus", () => {
  it("returns null for terminal states", () => {
    expect(getNextStatus("completed", "dine-in")).toBeNull();
    expect(getNextStatus("cancelled", "dine-in")).toBeNull();
  });

  it("returns first non-cancel transition for most states", () => {
    expect(getNextStatus("pending", "dine-in")).toBe("confirmed");
    expect(getNextStatus("confirmed", "dine-in")).toBe("preparing");
    expect(getNextStatus("preparing", "dine-in")).toBe("ready");
  });

  it("returns on-the-way for delivery orders in ready state", () => {
    expect(getNextStatus("ready", "delivery")).toBe("on-the-way");
  });

  it("returns delivered for non-delivery orders in ready state", () => {
    expect(getNextStatus("ready", "dine-in")).toBe("delivered");
    expect(getNextStatus("ready", "take-away")).toBe("delivered");
    expect(getNextStatus("ready", "pickup")).toBe("delivered");
  });

  it("returns delivered for on-the-way state", () => {
    expect(getNextStatus("on-the-way", "delivery")).toBe("delivered");
  });

  it("returns completed for delivered state", () => {
    expect(getNextStatus("delivered", "dine-in")).toBe("completed");
  });
});

describe("canTransition", () => {
  it("returns true for valid transitions", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("ready", "delivered")).toBe(true);
  });

  it("returns false for invalid transitions", () => {
    expect(canTransition("pending", "ready")).toBe(false);
    expect(canTransition("completed", "pending")).toBe(false);
    expect(canTransition("cancelled", "pending")).toBe(false);
  });
});

describe("KANBAN_COLUMNS", () => {
  it("has 4 columns", () => {
    expect(KANBAN_COLUMNS).toHaveLength(4);
  });

  it("covers all active statuses", () => {
    const allColumnStatuses = KANBAN_COLUMNS.flatMap((col) => col.statuses);
    ACTIVE_STATUSES.forEach((status) => {
      expect(allColumnStatuses).toContain(status);
    });
  });
});

describe("ACTIVE_STATUSES", () => {
  it("does not include terminal states", () => {
    expect(ACTIVE_STATUSES).not.toContain("completed");
    expect(ACTIVE_STATUSES).not.toContain("cancelled");
  });

  it("includes all workflow states", () => {
    expect(ACTIVE_STATUSES).toContain("pending");
    expect(ACTIVE_STATUSES).toContain("confirmed");
    expect(ACTIVE_STATUSES).toContain("preparing");
    expect(ACTIVE_STATUSES).toContain("ready");
    expect(ACTIVE_STATUSES).toContain("on-the-way");
  });
});

describe("buildDefaultWindowOr", () => {
  const since = "2026-10-06T00:00:00.000Z";
  const or = buildDefaultWindowOr(since);

  it("incluye estados activos y la ventana por created_at", () => {
    expect(or).toContain(`status.in.(${ACTIVE_STATUSES.join(",")})`);
    expect(or).toContain(`created_at.gte.${since}`);
  });

  it("incluye payment_status.eq.pending — lo no cobrado siempre visible", () => {
    // Regresión #15 (checklist 07 Oct): sin esta condición, órdenes
    // delivered/pending de más de 48h desaparecían de Caja → cobro perdido.
    expect(or).toContain("payment_status.eq.pending");
  });
});
