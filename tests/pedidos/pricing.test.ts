import { describe, it, expect } from "vitest";
import { computeItemPrice, priceOrderItems, computeTaxBreakdown, type CatalogProduct } from "@/lib/pricing";

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    basePrice: 100,
    sizes: [
      { id: "size-l", name: "Grande", price: 120 },
      { id: "size-s", name: "Chico", price: 100 },
    ],
    sauces: [{ id: "sauce-m", name: "Mango", price: 5 }],
    extras: [{ id: "extra-q", name: "Queso", price: 10 }],
    ...overrides,
  };
}

describe("computeItemPrice", () => {
  it("prices base product", () => {
    expect(computeItemPrice(product(), null)).toBe(100);
  });

  it("size reemplaza basePrice (precios de tamaño absolutos)", () => {
    const p = product();
    expect(computeItemPrice(p, { size: { id: "size-s" } })).toBe(100);
    expect(computeItemPrice(p, { size: { id: "size-l" } })).toBe(120);
  });

  it("suma salsa y extras sobre el precio del tamaño", () => {
    const p = product();
    expect(
      computeItemPrice(p, {
        size: { id: "size-l" },
        sauce: { id: "sauce-m" },
        extras: [{ id: "extra-q" }],
      }),
    ).toBe(135);
  });

  it("rounds to 2 decimals", () => {
    const p = product({ basePrice: 10.5, extras: [{ id: "x", name: "X", price: 0.05 }] });
    expect(computeItemPrice(p, { extras: [{ id: "x" }] })).toBe(10.55);
  });

  it("rejects an option id not in the catalog", () => {
    expect(() =>
      computeItemPrice(product(), { size: { id: "size-inventado" } }),
    ).toThrow("Modificador de tamaño inválido");
  });
});

describe("priceOrderItems", () => {
  const p1 = product();
  const p2 = product({ id: "00000000-0000-0000-0000-000000000002", basePrice: 50 });

  it("computes unit and total per item with quantity rounding", () => {
    const items = [
      { product_id: p1.id, quantity: 3 },
      {
        product_id: p2.id,
        quantity: 2,
        modifiers: { extras: [{ id: "extra-q" }] },
      },
    ];
    const priced = priceOrderItems([p1, p2], items);
    expect(priced[0]).toMatchObject({ unit_price: 100, total_price: 300 });
    expect(priced[1]).toMatchObject({ unit_price: 60, total_price: 120 });
  });

  it("item con tamaño: unit_price NO suma basePrice dos veces", () => {
    const items = [
      {
        product_id: p1.id,
        quantity: 2,
        modifiers: { size: { id: "size-l" }, extras: [{ id: "extra-q" }] },
      },
    ];
    const priced = priceOrderItems([p1], items);
    expect(priced[0]).toMatchObject({ unit_price: 130, total_price: 260 });
  });

  it("throws on unknown product", () => {
    expect(() =>
      priceOrderItems([p1], [{ product_id: "00000000-0000-0000-0000-000000000999", quantity: 1 }]),
    ).toThrow("Producto no encontrado");
  });

  it("acumula el total de la comanda: suma de total_price de todos los items", () => {
    const items = [
      { product_id: p1.id, quantity: 3 },
      {
        product_id: p2.id,
        quantity: 2,
        modifiers: { extras: [{ id: "extra-q" }] },
      },
      { product_id: p1.id, quantity: 1 },
    ];
    const priced = priceOrderItems([p1, p2], items);
    const totalComanda = priced.reduce((sum, it) => sum + it.total_price, 0);
    expect(totalComanda).toBe(520); // 300 + 120 + 100
  });
});

describe("computeTaxBreakdown (impuestos incluidos en precio)", () => {
  it("sin impuestos: neto = total, tax = 0", () => {
    expect(computeTaxBreakdown(150, { taxEnabled: false, taxRate: null })).toEqual({
      net: 150,
      tax: 0,
      total: 150,
    });
  });

  it("desglosa sin recargar: neto + tax = total", () => {
    const b = computeTaxBreakdown(116, { taxEnabled: true, taxRate: 0.16 });
    expect(b).toEqual({ net: 100, tax: 16, total: 116 });
    expect(b.net + b.tax).toBe(b.total);
  });

  it("rate congelado: solo importa la tasa al cobrar, no después", () => {
    // mismos $160 cobrados con 16% siempre desglosan igual
    const a = computeTaxBreakdown(160, { taxEnabled: true, taxRate: 0.16 });
    const b = computeTaxBreakdown(160, { taxEnabled: true, taxRate: 0.16 });
    expect(a).toEqual(b);
  });

  it("redondeo a 2 decimales con tasas no exactas", () => {
    const b = computeTaxBreakdown(99.99, { taxEnabled: true, taxRate: 0.16 });
    expect(b.tax).toBe(13.79);
    expect(b.net + b.tax).toBeCloseTo(99.99, 2);
    expect(b.net.toFixed(2)).toBe("86.20");
  });

  it("tax_rate 0 o negativo se trata como sin impuesto", () => {
    expect(computeTaxBreakdown(50, { taxEnabled: true, taxRate: 0 })).toEqual({ net: 50, tax: 0, total: 50 });
  });
});
