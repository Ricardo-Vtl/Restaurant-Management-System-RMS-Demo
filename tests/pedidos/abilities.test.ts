import { describe, it, expect } from "vitest";
import { ABILITIES, can, type Ability } from "@/lib/abilities";
import { canRoleTransition, canTransition } from "@/lib/status-transitions";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["admin", "cashier", "waiter", "kitchen"];

describe("ABILITIES (V9-ARQ-02)", () => {
  it("define roles validos para cada habilidad", () => {
    for (const roles of Object.values(ABILITIES)) {
      for (const role of roles) {
        expect(ROLES).toContain(role);
      }
    }
  });

  it("admin tiene todas las habilidades", () => {
    for (const ability of Object.keys(ABILITIES) as Ability[]) {
      expect(can("admin", ability)).toBe(true);
    }
  });

  it("can() rechaza rol ausente", () => {
    expect(can(undefined, "orders:checkout")).toBe(false);
    expect(can(null, "orders:create")).toBe(false);
  });

  it("can() es coherente con canRoleTransition para entregar/cancelar", () => {
    for (const role of ROLES) {
      const abilityDeliver = can(role, "orders:deliver");
      const machineDeliver = canTransition("ready", "delivered") && canRoleTransition(role, "ready", "delivered");
      expect(abilityDeliver).toBe(machineDeliver);

      const abilityCancel = can(role, "orders:cancel");
      const machineCancel = canTransition("pending", "cancelled") && canRoleTransition(role, "pending", "cancelled");
      expect(abilityCancel).toBe(machineCancel);
    }
  });

  it("kitchen solo cocina: no crea/cobra/cancela ni administra", () => {
    expect(can("kitchen", "orders:create")).toBe(false);
    expect(can("kitchen", "orders:checkout")).toBe(false);
    expect(can("kitchen", "orders:cancel")).toBe(false);
    expect(can("kitchen", "products:manage")).toBe(false);
    expect(can("kitchen", "tables:manage")).toBe(false);
    expect(can("kitchen", "orders:kds-mark")).toBe(true);
    expect(can("kitchen", "kds:view")).toBe(true);
  });

  it("waiter opera sala y comandas, no cobra", () => {
    expect(can("waiter", "orders:create")).toBe(true);
    expect(can("waiter", "orders:reopen")).toBe(true);
    expect(can("waiter", "orders:deliver")).toBe(true);
    expect(can("waiter", "orders:checkout")).toBe(false);
    expect(can("waiter", "orders:cancel")).toBe(false);
  });

  it("cashier cobra y administra menu, no configura el local", () => {
    expect(can("cashier", "orders:checkout")).toBe(true);
    expect(can("cashier", "products:manage")).toBe(true);
    expect(can("cashier", "tables:manage")).toBe(false);
    expect(can("cashier", "config:manage")).toBe(false);
  });
});