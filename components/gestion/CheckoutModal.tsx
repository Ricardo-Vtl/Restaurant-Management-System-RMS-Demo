"use client";

import { Table } from "@/lib/types";
import { useInvalidateTables } from "@/hooks/use-tables";
import { useTableOrders, useInvalidateOrders } from "@/hooks/use-orders";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Banknote, Receipt, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { computeTaxBreakdown } from "@/lib/pricing";

interface Props {
  mesa: Table & { totalCuenta?: number };
  isOpen: boolean;
  onClose: () => void;
  onServiceCompleted?: () => void;
}

export const CheckoutModal = ({ mesa, isOpen, onClose, onServiceCompleted }: Props) => {
  const { data: mesaOrders = [] } = useTableOrders(mesa.id);
  const invalidateTables = useInvalidateTables();
  const invalidateOrders = useInvalidateOrders();
  const { data: config } = useRestaurantConfig();
  const taxEnabled = config?.tax_enabled ?? false;
  const breakdown = computeTaxBreakdown(mesa.totalCuenta ?? 0, {
    taxEnabled,
    taxRate: config?.tax_rate ?? null,
  });
  const [method, setMethod] = useState<"cash" | "card">("cash");
  // Reset por cobro: el modal queda montado entre aperturas — sin esto, el
  // siguiente cobro heredaría el método anterior.
  useEffect(() => {
    if (isOpen) setMethod("cash");
  }, [isOpen]);
  const [isSaving, setIsSaving] = useState(false);

  const handleFinishPayment = async () => {
    try {
      setIsSaving(true);

      await apiFetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ tableId: mesa.id, paymentMethod: method }),
      });

      invalidateTables();
      invalidateOrders();

      toast.success(`Mesa ${mesa.number} liberada correctamente`);

      // 5. Avisar al padre que el servicio terminó antes de cerrar el sub-modal
      if (onServiceCompleted) {
        onServiceCompleted();
      }

      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error al cerrar cuenta:", msg);
      toast.error("No se pudo sincronizar con la base de datos");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-muted">
        <DialogHeader className="p-6 bg-navy text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-coral rounded-lg">
              <Receipt size={20} className="text-white" />
            </div>
            <div>
              <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">
                Cierre de Cuenta
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase italic">
                Mesa {mesa.number} • {mesaOrders.length} Comandas
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-6">
          <div className="bg-white border-2 border-dashed border-border rounded-2xl p-4 shadow-sm text-center">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Final</span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-2xl font-black text-navy">$</span>
              <span className="text-5xl font-black text-navy italic tracking-tighter">
                {mesa.totalCuenta?.toFixed(2)}
              </span>
            </div>
            {taxEnabled && (
              <div className="mt-3 pt-3 border-t border-dashed border-border flex flex-col gap-1 text-left">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${breakdown.net.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{config?.tax_label || "IVA"} incluido</span>
                  <span>${breakdown.tax.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black text-navy uppercase italic">Metodo de Pago</p>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as "cash" | "card")} className="grid grid-cols-2 gap-3">
              <label
                className={cn("p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer", method === "cash" ? "border-navy bg-navy text-white" : "border-white bg-white text-muted-foreground")}
              >
                <Banknote size={24} />
                <span className="text-[10px] font-black uppercase italic">Efectivo</span>
                <RadioGroupItem value="cash" id="mesa-cash" className="sr-only" />
              </label>
              <label
                className={cn("p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer", method === "card" ? "border-navy bg-navy text-white" : "border-white bg-white text-muted-foreground")}
              >
                <CreditCard size={24} />
                <span className="text-[10px] font-black uppercase italic">Tarjeta</span>
                <RadioGroupItem value="card" id="mesa-card" className="sr-only" />
              </label>
            </RadioGroup>
        </div>

          <Button
            onClick={handleFinishPayment}
            disabled={isSaving}
            className={cn(
              "w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic shadow-xl transition-all",
              isSaving
                ? "bg-muted text-muted-foreground"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100",
            )}
          >
            {isSaving ? (
              <Loader2 className="animate-spin mr-2" size={18} />
            ) : (
              <CheckCircle2 className="mr-2" size={18} />
            )}
            {isSaving ? "Procesando..." : "Confirmar Pago y Liberar Mesa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
