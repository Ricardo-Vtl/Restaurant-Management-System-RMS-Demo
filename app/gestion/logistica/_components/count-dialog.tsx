"use client";

import { useEffect, useState } from "react";
import { Loader2, ClipboardCheck } from "lucide-react";
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
import { formatQty, type Supply } from "@/lib/inventory";
import { useSupplyCount } from "@/hooks/use-supplies";

interface CountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supply: Supply | null;
}

export function CountDialog({ isOpen, onClose, supply }: CountDialogProps) {
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");

  const count = useSupplyCount();

  useEffect(() => {
    if (isOpen) {
      setCounted("");
      setReason("");
    }
  }, [isOpen]);

  const parsedCounted = Number(counted.replace(",", "."));
  const countedValid = counted.trim() !== "" && Number.isFinite(parsedCounted) && parsedCounted >= 0;
  const delta = supply ? parsedCounted - supply.stock_current : 0;
  const canSubmit = countedValid && !count.isPending && supply !== null;

  const handleSubmit = async () => {
    if (!supply) return;
    try {
      await count.mutateAsync({
        supply_id: supply.id,
        counted: parsedCounted,
        ...(reason.trim() && { reason: reason.trim() }),
      });
      toast.success("Conteo registrado");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el conteo");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
              <ClipboardCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Conteo físico</DialogTitle>
              <DialogDescription>
                {supply
                  ? `${supply.name} — el sistema dice ${formatQty(supply.stock_current)} ${supply.unit}. Escribe lo que contaste.`
                  : "Selecciona un insumo"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="count-value">Cantidad contada {supply && `(${supply.unit})`}</Label>
            <Input
              id="count-value"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.000"
            />
            {countedValid && supply && (
              <p className="text-xs text-muted-foreground">
                {delta === 0
                  ? "Sin diferencia — no se registrará movimiento."
                  : `Diferencia: ${delta > 0 ? "+" : "−"}${formatQty(Math.abs(delta))} ${supply.unit}`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="count-reason">Razón (opcional)</Label>
            <Input
              id="count-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              autoComplete="off"
              placeholder="Ej. Conteo semanal"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={count.isPending} className="h-11 sm:h-9">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-coral hover:bg-coral/90 h-11 sm:h-9">
            {count.isPending && <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />}
            Guardar conteo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
