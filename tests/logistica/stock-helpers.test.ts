import { describe, it, expect } from "vitest";
import {
  isLowStock,
  formatQty,
  SUPPLY_UNIT_LABELS,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/inventory";

describe("isLowStock (módulo Logística)", () => {
  it("sin mínimo configurado (0) y en cero no alerta", () => {
    expect(isLowStock({ stock_current: 0, stock_min: 0 })).toBe(false);
  });

  it("alerta cuando stock <= mínimo configurado", () => {
    expect(isLowStock({ stock_current: 5, stock_min: 5 })).toBe(true);
    expect(isLowStock({ stock_current: 4.99, stock_min: 5 })).toBe(true);
    expect(isLowStock({ stock_current: 6, stock_min: 5 })).toBe(false);
  });

  it("stock negativo siempre alerta (incluso sin mínimo)", () => {
    expect(isLowStock({ stock_current: -0.25, stock_min: 0 })).toBe(true);
  });
});

describe("formatQty", () => {
  it("sin ceros colgantes y hasta 3 decimales", () => {
    expect(formatQty(3)).toBe("3");
    expect(formatQty(12.5)).toBe("12.5");
    expect(formatQty(0.25)).toBe("0.25");
    expect(formatQty(1.23456)).toBe("1.235");
  });
});

describe("labels de inventario", () => {
  it("cubre las 5 unidades y los 4 tipos de movimiento", () => {
    expect(Object.keys(SUPPLY_UNIT_LABELS).sort()).toEqual(["g", "kg", "l", "ml", "pza"]);
    expect(Object.keys(MOVEMENT_TYPE_LABELS).sort()).toEqual(["adjust", "in", "out", "waste"]);
  });
});
