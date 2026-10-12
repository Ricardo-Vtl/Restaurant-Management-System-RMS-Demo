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
import { formatQty, MOVEMENT_TYPE_LABELS, type Supply } from "@/lib/inventory";
import { useSupplyMovement } from "@/hooks/use-supplies";

export type ManualMovementType = "in" | "out" | "waste";

const TYPE_OPTIONS: ManualMovementType[] = ["in", "out", "waste"];

const SUCCESS_MESSAGES: Record<ManualMovementType, string> = {
  in: "Entrada registrada",
  out: "Salida registrada",
  waste: "Merma registrada",
};

interface MovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supply: Supply | null;
  defaultType: ManualMovementType;
}

export function MovementDialog({ isOpen, onClose, supply, defaultType }: MovementDialogProps) {
  const [type, setType] = useState<ManualMovementType>(defaultType);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const movement = useSupplyMovement();

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setQuantity("");
      setReason("");
    }
  }, [isOpen, defaultType]);

  const parsedQty = Number(quantity.replace(",", "."));
  const qtyValid = quantity.trim() !== "" && Number.isFinite(parsedQty) && parsedQty > 0;
  const delta = type === "in" ? parsedQty : -parsedQty;
  const remaining = supply ? supply.stock_current + delta : 0;
  const wouldGoNegative = qtyValid && remaining < 0;
  const canSubmit = qtyValid && !wouldGoNegative && !movement.isPending && supply !== null;

  const handleSubmit = async () => {
    if (!supply) return;
    try {
      await movement.mutateAsync({
        supply_id: supply.id,
        type,
        quantity: parsedQty,
        ...(reason.trim() && { reason: reason.trim() }),
      });
      toast.success(SUCCESS_MESSAGES[type]);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el movimiento");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimiento de insumo</DialogTitle>
          <DialogDescription>
            {supply
              ? `${supply.name} — hay ${formatQty(supply.stock_current)} ${supply.unit}`
              : "Selecciona un insumo"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="movement-type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as ManualMovementType)}>
              <SelectTrigger id="movement-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MOVEMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="movement-qty">Cantidad {supply && `(${supply.unit})`}</Label>
            <Input
              id="movement-qty"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.000"
            />
            {qtyValid && supply && (
              <p
                className={
                  wouldGoNegative
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {wouldGoNegative
                  ? `No alcanza: quedaría en ${formatQty(remaining)} ${supply.unit}. Usa un conteo para corregir el stock.`
                  : `Quedarán ${formatQty(remaining)} ${supply.unit}`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="movement-reason">Razón (opcional)</Label>
            <Input
              id="movement-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              autoComplete="off"
              placeholder={type === "in" ? "Ej. Compra a proveedor" : "Ej. Producto dañado"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={movement.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-coral hover:bg-coral/90">
            {movement.isPending && <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
