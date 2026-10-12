"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { SUPPLY_UNIT_LABELS, type Supply } from "@/lib/inventory";
import { supplyUnits, type SupplyUpdateInput } from "@/lib/api-schemas";
import { useCreateSupply, useUpdateSupply } from "@/hooks/use-supplies";

type SupplyUnit = (typeof supplyUnits)[number];

const UNIT_OPTIONS: Record<SupplyUnit, string> = {
  kg: "kg — kilogramos",
  g: "g — gramos",
  l: "L — litros",
  ml: "ml — mililitros",
  pza: "pza — piezas",
};

interface SupplyFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editing: Supply | null;
}

export function SupplyFormDialog({ isOpen, onClose, editing }: SupplyFormDialogProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<SupplyUnit>("kg");
  const [stockMin, setStockMin] = useState("0");

  const createSupply = useCreateSupply();
  const updateSupply = useUpdateSupply();
  const isPending = createSupply.isPending || updateSupply.isPending;

  useEffect(() => {
    if (isOpen) {
      setName(editing?.name ?? "");
      setUnit((editing?.unit as SupplyUnit) ?? "kg");
      setStockMin(editing ? String(editing.stock_min) : "0");
    }
  }, [isOpen, editing]);

  const parsedMin = Number(stockMin.replace(",", "."));
  const minValid = stockMin.trim() !== "" && Number.isFinite(parsedMin) && parsedMin >= 0;
  const canSubmit = name.trim().length >= 1 && minValid && !isPending;

  const handleSubmit = async () => {
    try {
      if (editing) {
        const updates: SupplyUpdateInput["updates"] = {};
        if (name.trim() !== editing.name) updates.name = name.trim();
        if (unit !== editing.unit) updates.unit = unit;
        if (parsedMin !== editing.stock_min) updates.stock_min = parsedMin;
        if (Object.keys(updates).length === 0) {
          onClose();
          return;
        }
        await updateSupply.mutateAsync({ id: editing.id, updates });
        toast.success("Insumo actualizado");
      } else {
        await createSupply.mutateAsync({ name: name.trim(), unit, stock_min: parsedMin });
        toast.success(`${name.trim()} creado`);
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "El stock no se edita aquí: usa entrada, salida, merma o conteo."
              : "El insumo se crea en cero; registra una entrada para cargar stock."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="supply-name">Nombre</Label>
            <Input
              id="supply-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="off"
              placeholder="Ej. Camarón fresco"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supply-unit">Unidad</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as SupplyUnit)}>
              <SelectTrigger id="supply-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supplyUnits.map((u) => (
                  <SelectItem key={u} value={u}>
                    {UNIT_OPTIONS[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supply-min">Stock mínimo</Label>
            <Input
              id="supply-min"
              value={stockMin}
              onChange={(e) => setStockMin(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Al llegar a este nivel (o menos) el insumo se marca en alerta. 0 = sin alerta.
            </p>
            {stockMin.trim() !== "" && !minValid && (
              <p className="text-xs text-destructive">El mínimo debe ser un número mayor o igual a 0.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-coral hover:bg-coral/90">
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />}
            {editing ? "Guardar cambios" : "Crear insumo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
