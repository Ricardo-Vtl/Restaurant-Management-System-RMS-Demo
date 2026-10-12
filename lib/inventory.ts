import type { Database } from "@/lib/database.types";

export type Supply = Database["public"]["Tables"]["supplies"]["Row"];
export type SupplyMovement = Database["public"]["Tables"]["supply_movements"]["Row"];
export type SupplyMovementType = Database["public"]["Enums"]["supply_movement_type"];

export const SUPPLY_UNIT_LABELS: Record<string, string> = {
  kg: "kg",
  g: "g",
  l: "L",
  ml: "ml",
  pza: "pza",
};

export const MOVEMENT_TYPE_LABELS: Record<SupplyMovementType, string> = {
  in: "Entrada",
  out: "Salida",
  waste: "Merma",
  adjust: "Conteo",
};

// stock_current <= stock_min con mínimo configurado (>0), o stock negativo.
// ponytail: un insumo sin mínimo (0) y en cero no alerta (recién creado).
export function isLowStock(supply: Pick<Supply, "stock_current" | "stock_min">): boolean {
  if (supply.stock_current < 0) return true;
  return supply.stock_min > 0 && supply.stock_current <= supply.stock_min;
}

// Cantidad con hasta 3 decimales, sin ceros colgantes (12.500 → "12.5").
export function formatQty(value: number): string {
  return String(Number(value.toFixed(3)));
}
