"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/lib/types";
import { useSupplies } from "@/hooks/use-supplies";
import { useRecipes, useSetRecipe } from "@/hooks/use-recipes";

const BASE_SIZE = "base";

interface Line {
  key: string;
  sizeId: string;
  supplyId: string;
  quantity: string;
}

interface RecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function RecipeDialog({ isOpen, onClose, product }: RecipeDialogProps) {
  const { data: recipes = [] } = useRecipes();
  const { data: supplies = [] } = useSupplies();
  const setRecipe = useSetRecipe();
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!isOpen || !product) return;
    const existing = recipes.filter((r) => r.product_id === product.id);
    setLines(
      existing.map((r) => ({
        key: crypto.randomUUID(),
        sizeId: r.size_id ?? BASE_SIZE,
        supplyId: r.supply_id,
        quantity: String(r.quantity),
      })),
    );
  }, [isOpen, product, recipes]);

  const hasSizes = (product?.sizes?.length ?? 0) > 0;

  const parsed = lines.map((line) => ({
    ...line,
    qty: Number(line.quantity.replace(",", ".")),
  }));
  const allComplete = parsed.every(
    (l) => l.supplyId !== "" && l.quantity.trim() !== "" && Number.isFinite(l.qty) && l.qty > 0,
  );
  const canSave = allComplete && !setRecipe.isPending;

  const addLine = () =>
    setLines((prev) => [...prev, { key: crypto.randomUUID(), sizeId: BASE_SIZE, supplyId: "", quantity: "" }]);

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const handleSubmit = async () => {
    if (!product) return;
    try {
      await setRecipe.mutateAsync({
        product_id: product.id,
        lines: parsed.map((l) => ({
          size_id: l.sizeId === BASE_SIZE ? null : l.sizeId,
          supply_id: l.supplyId,
          quantity: l.qty,
        })),
      });
      toast.success(lines.length === 0 ? "Receta eliminada" : "Receta guardada");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la receta");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receta — {product?.name ?? "Producto"}</DialogTitle>
          <DialogDescription>
            Define los insumos por platillo; el stock se descuenta solo al entrar la orden a cocina.
            {hasSizes && " Las líneas Base aplican a toda talla; una línea con talla tiene prioridad para esa talla."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Sin insumos asignados — este producto no descuenta inventario.
            </p>
          ) : (
            lines.map((line) => {
              const qty = Number(line.quantity.replace(",", "."));
              const qtyInvalid = line.quantity.trim() !== "" && (!Number.isFinite(qty) || qty <= 0);
              return (
                <div key={line.key} className="grid grid-cols-[7rem_1fr_7rem_auto] items-end gap-2">
                  {hasSizes ? (
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`size-${line.key}`} className="text-xs">
                        Talla
                      </Label>
                      <Select
                        value={line.sizeId}
                        onValueChange={(v) =>
                          setLines((prev) => prev.map((l) => (l.key === line.key ? { ...l, sizeId: v } : l)))
                        }
                      >
                        <SelectTrigger id={`size-${line.key}`} className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={BASE_SIZE}>Base</SelectItem>
                          {(product?.sizes ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`supply-${line.key}`} className="text-xs">
                      Insumo
                    </Label>
                    <Select
                      value={line.supplyId || "none"}
                      onValueChange={(v) =>
                        setLines((prev) => prev.map((l) => (l.key === line.key ? { ...l, supplyId: v } : l)))
                      }
                    >
                      <SelectTrigger id={`supply-${line.key}`} className="h-9">
                        <SelectValue placeholder="Elige insumo" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.is_active ? "" : " (inactivo)"} — {s.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`qty-${line.key}`} className="text-xs">
                      Cantidad
                    </Label>
                    <Input
                      id={`qty-${line.key}`}
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, quantity: e.target.value } : l)),
                        )
                      }
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0.000"
                      className="h-9"
                      aria-invalid={qtyInvalid || undefined}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-destructive hover:bg-destructive/10"
                    onClick={() => removeLine(line.key)}
                    aria-label="Quitar línea de receta"
                    title="Quitar línea"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              );
            })
          )}

          {!allComplete && (
            <p className="text-xs text-destructive">
              Completa insumo y cantidad (mayor a 0) en todas las líneas para guardar.
            </p>
          )}

          <Button variant="outline" size="sm" onClick={addLine} className="self-start">
            <Plus className="size-4 mr-2" aria-hidden="true" /> Agregar insumo
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={setRecipe.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave} className="bg-coral hover:bg-coral/90">
            {setRecipe.isPending && <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />}
            Guardar receta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
