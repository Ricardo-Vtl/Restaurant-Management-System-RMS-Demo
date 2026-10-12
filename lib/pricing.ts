import type { ProductOption } from "@/lib/types";

// ── Server-side pricing (V9-SEC-04) ──
// El cliente envía intención (producto, qty, modificadores), nunca montos.
// Los precios se resuelven desde el catálogo en BD por id. Los tamaños son de
// precio ABSOLUTO: size.price REEMPLAZA basePrice (no se suma); salsa y extras
// sí se suman. Es la única implementación de precios — también la usa la UI.

export interface CatalogProduct {
  id: string;
  basePrice: number;
  sizes?: ProductOption[] | null;
  sauces?: ProductOption[] | null;
  extras?: ProductOption[] | null;
}

export interface PricingModifiers {
  size?: { id: string } | null;
  sauce?: { id: string } | null;
  extras?: { id: string }[] | null;
}

export interface ItemIntent {
  product_id: string;
  quantity: number;
  modifiers?: PricingModifiers | null;
}

export interface PricedItem extends ItemIntent {
  unit_price: number;
  total_price: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface TaxBreakdown {
  net: number;
  tax: number;
  total: number;
}

// Precios con impuesto incluido (estilo MX): el total ya lo trae; aquí solo se
// desglosa sin recargar. El monto del impuesto se congela en orders.tax al cobrar.
export function computeTaxBreakdown(
  total: number,
  opts: { taxEnabled: boolean; taxRate: number | null | undefined },
): TaxBreakdown {
  const rate = opts.taxRate ?? 0;
  if (!opts.taxEnabled || rate <= 0) return { net: total, tax: 0, total };
  const tax = round2(total - total / (1 + rate));
  return { net: round2(total - tax), tax, total };
}

function optionPrice(options: ProductOption[] | null | undefined, id: string, label: string) {
  const opt = options?.find((o) => o.id === id);
  if (!opt) throw new Error(`Modificador de ${label} inválido para el producto`);
  return Number(opt.price) || 0;
}

export function computeItemPrice(
  product: CatalogProduct,
  modifiers: PricingModifiers | null | undefined,
): number {
  const sizeId = modifiers?.size?.id;
  let price = sizeId
    ? optionPrice(product.sizes, sizeId, "tamaño")
    : Number(product.basePrice) || 0;
  if (modifiers?.sauce?.id) price += optionPrice(product.sauces, modifiers.sauce.id, "salsa");
  for (const extra of modifiers?.extras ?? []) price += optionPrice(product.extras, extra.id, "extra");
  return round2(price);
}

export function priceOrderItems(products: CatalogProduct[], items: ItemIntent[]): PricedItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.map((item) => {
    const product = byId.get(item.product_id);
    if (!product) throw new Error("Producto no encontrado");
    const unit_price = computeItemPrice(product, item.modifiers);
    return { ...item, unit_price, total_price: round2(unit_price * item.quantity) };
  });
}
