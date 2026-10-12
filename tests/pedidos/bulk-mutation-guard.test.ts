import { describe, it, expect } from "vitest";
import { productUpdateSchema, tableUpdateSchema } from "@/lib/api-schemas";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("V9-SEC-05 — mutaciones con id obligatorio (sin bulk)", () => {
  describe("productUpdateSchema", () => {
    it("rechaza filtro-abierto (bulk por categoría)", () => {
      expect(() =>
        productUpdateSchema.parse({
          filters: { category: "tacos" },
          updates: { available: false },
        }),
      ).toThrow();
    });

    it("rechaza filtros vacíos", () => {
      expect(() =>
        productUpdateSchema.parse({
          filters: {},
          updates: { available: false },
        }),
      ).toThrow();
    });

    it("acepta update por id", () => {
      const parsed = productUpdateSchema.parse({
        filters: { id: UUID },
        updates: { available: false },
      });
      expect(parsed.filters.id).toBe(UUID);
    });
  });

  describe("tableUpdateSchema", () => {
    it("rechaza filtro-abierto (bulk por estado)", () => {
      expect(() =>
        tableUpdateSchema.parse({
          filters: { status: "free" },
          updates: { status: "occupied" },
        }),
      ).toThrow();
    });

    it("acepta id como único filtro", () => {
      const parsed = tableUpdateSchema.parse({
        filters: { id: UUID },
        updates: { status: "occupied" },
      });
      expect(parsed.filters.id).toBe(UUID);
    });

    it("acepta id + status (chequeo optimista de handleOpenTable)", () => {
      const parsed = tableUpdateSchema.parse({
        filters: { id: UUID, status: "free" },
        updates: { status: "occupied" },
      });
      expect(parsed.filters).toEqual({ id: UUID, status: "free" });
    });
  });
});
