import { describe, it, expect } from "vitest";
import {
  supplyCreateSchema,
  supplyUpdateSchema,
  supplyMovementSchema,
  supplyCountSchema,
  recipeSetSchema,
} from "@/lib/api-schemas";

const UUID = "27168df1-60da-40a9-b051-52b7e52459f0";

describe("supplyCreateSchema (módulo Logística)", () => {
  it("acepta insumo válido y aplica stock_min default 0", () => {
    const r = supplyCreateSchema.safeParse({ name: "Camarón", unit: "kg" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.stock_min).toBe(0);
  });

  it("rechaza unidades fuera de la lista", () => {
    expect(supplyCreateSchema.safeParse({ name: "Camarón", unit: "litros" }).success).toBe(false);
    expect(supplyCreateSchema.safeParse({ name: "Camarón", unit: "CAJA" }).success).toBe(false);
  });

  it("rechaza nombre vacío y mínimo negativo", () => {
    expect(supplyCreateSchema.safeParse({ name: "  ", unit: "kg" }).success).toBe(false);
    expect(supplyCreateSchema.safeParse({ name: "Camarón", unit: "kg", stock_min: -1 }).success).toBe(false);
  });

  it("strict: rechaza campos desconocidos (stock_current no es seteable)", () => {
    expect(
      supplyCreateSchema.safeParse({ name: "Camarón", unit: "kg", stock_current: 100 }).success,
    ).toBe(false);
  });
});

describe("supplyUpdateSchema", () => {
  it("acepta update parcial válido", () => {
    expect(supplyUpdateSchema.safeParse({ id: UUID, updates: { stock_min: 3 } }).success).toBe(true);
    expect(supplyUpdateSchema.safeParse({ id: UUID, updates: { is_active: false } }).success).toBe(true);
  });

  it("rechaza updates vacíos y uuid inválido", () => {
    expect(supplyUpdateSchema.safeParse({ id: UUID, updates: {} }).success).toBe(false);
    expect(supplyUpdateSchema.safeParse({ id: "no-uuid", updates: { stock_min: 3 } }).success).toBe(false);
  });

  it("strict: no permite stock_current por PATCH", () => {
    expect(
      supplyUpdateSchema.safeParse({ id: UUID, updates: { stock_current: 0 } }).success,
    ).toBe(false);
  });
});

describe("supplyMovementSchema", () => {
  it("acepta in/out/waste con cantidad positiva", () => {
    for (const type of ["in", "out", "waste"]) {
      expect(supplyMovementSchema.safeParse({ supply_id: UUID, type, quantity: 1.5 }).success).toBe(true);
    }
  });

  it("rechaza adjust (solo vía conteo) y cantidades no positivas", () => {
    expect(supplyMovementSchema.safeParse({ supply_id: UUID, type: "adjust", quantity: 1 }).success).toBe(false);
    expect(supplyMovementSchema.safeParse({ supply_id: UUID, type: "in", quantity: 0 }).success).toBe(false);
    expect(supplyMovementSchema.safeParse({ supply_id: UUID, type: "in", quantity: -2 }).success).toBe(false);
  });

  it("razón opcional con máximo 200 caracteres", () => {
    expect(supplyMovementSchema.safeParse({ supply_id: UUID, type: "in", quantity: 1, reason: "Compra semanal" }).success).toBe(true);
    expect(supplyMovementSchema.safeParse({ supply_id: UUID, type: "in", quantity: 1, reason: "x".repeat(201) }).success).toBe(false);
  });
});

describe("supplyCountSchema", () => {
  it("acepta conteo 0 y rechaza negativos", () => {
    expect(supplyCountSchema.safeParse({ supply_id: UUID, counted: 0 }).success).toBe(true);
    expect(supplyCountSchema.safeParse({ supply_id: UUID, counted: -0.5 }).success).toBe(false);
  });
});

describe("recipeSetSchema", () => {
  it("acepta líneas base y por talla", () => {
    const r = recipeSetSchema.safeParse({
      product_id: UUID,
      lines: [
        { supply_id: UUID, quantity: 0.25 },
        { size_id: "grande", supply_id: UUID, quantity: 0.4 },
        { size_id: null, supply_id: "b2f4b2f4-6f6f-4f6f-8f6f-0f0f0f0f0f0f", quantity: 1 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("acepta receta vacía (la limpia)", () => {
    expect(recipeSetSchema.safeParse({ product_id: UUID, lines: [] }).success).toBe(true);
  });

  it("rechaza duplicados misma talla+insumo y acepta mismo insumo en tallas distintas", () => {
    expect(
      recipeSetSchema.safeParse({
        product_id: UUID,
        lines: [
          { supply_id: UUID, quantity: 1 },
          { size_id: null, supply_id: UUID, quantity: 2 },
        ],
      }).success,
    ).toBe(false);

    expect(
      recipeSetSchema.safeParse({
        product_id: UUID,
        lines: [
          { size_id: "chico", supply_id: UUID, quantity: 1 },
          { size_id: "grande", supply_id: UUID, quantity: 2 },
        ],
      }).success,
    ).toBe(true);
  });

  it("rechaza cantidad no positiva y supply_id inválido", () => {
    expect(recipeSetSchema.safeParse({ product_id: UUID, lines: [{ supply_id: UUID, quantity: 0 }] }).success).toBe(false);
    expect(recipeSetSchema.safeParse({ product_id: UUID, lines: [{ supply_id: "x", quantity: 1 }] }).success).toBe(false);
  });
});
