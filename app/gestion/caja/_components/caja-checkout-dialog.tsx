"use client";

import { useEffect, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Banknote, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useOrderCheckout } from "@/hooks/use-orders";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { computeTaxBreakdown } from "@/lib/pricing";
import type { Order, PaymentMethod } from "@/lib/types";

interface Props {
  orders: Order[];
  label: string;
  tableId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "transfer", label: "Transferencia", icon: ArrowLeftRight },
];

export function CajaCheckoutDialog({ orders, label, tableId, isOpen, onClose }: Props) {
  const checkout = useOrderCheckout();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  // Reset por cobro: el diálogo queda montado entre aperturas y el estado
  // persistiría — sin esto, el siguiente cobro heredaría el método anterior.
  useEffect(() => {
    if (isOpen) setMethod("cash");
  }, [isOpen]);
  const total = orders.reduce((s, o) => s + o.total, 0);
  const deliveryFee = orders.reduce((s, o) => s + (o.deliveryFee ?? 0), 0);
  const { data: config } = useRestaurantConfig();
  const taxEnabled = config?.tax_enabled ?? false;
  const breakdown = computeTaxBreakdown(total, {
    taxEnabled,
    taxRate: config?.tax_rate ?? null,
  });
  const isGroup = orders.length > 1;

  const handleConfirm = async () => {
    try {
      if (tableId) {
        // Mesa: un solo cobro atómico (todo-o-nada, como el modal de Mesas).
        await checkout.mutateAsync({ tableId, paymentMethod: method });
      } else {
        for (const order of orders) {
          await checkout.mutateAsync({ orderId: order.id, paymentMethod: method });
        }
      }
      toast.success(`${label} cobrada correctamente`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cobrar");
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
                {label} • {orders.length} {isGroup ? "comandas" : "orden"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-6">
          <div className="bg-white border-2 border-dashed border-border rounded-2xl p-4 shadow-sm text-center">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Final</span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-2xl font-black text-navy">$</span>
              <span className="text-5xl font-black text-navy italic tracking-tighter">{total.toFixed(2)}</span>
            </div>
            {(deliveryFee > 0 || taxEnabled) && (
              <div className="mt-3 pt-3 border-t border-dashed border-border flex flex-col gap-1 text-left">
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Envío (incluido)</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {taxEnabled && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${breakdown.net.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{config?.tax_label || "IVA"} incluido</span>
                      <span>${breakdown.tax.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black text-navy uppercase italic">Método de Pago</p>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="grid grid-cols-3 gap-2">
              {METHODS.map(({ value, label: mLabel, icon: Icon }) => (
                <label
                  key={value}
                  className={cn("p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer", method === value ? "border-navy bg-navy text-white" : "border-white bg-white text-muted-foreground")}
                >
                  <Icon size={22} />
                  <span className="text-[9px] font-black uppercase italic">{mLabel}</span>
                  <RadioGroupItem value={value} id={`caja-${value}`} className="sr-only" />
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={checkout.isPending}
            className={cn(
              "w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic shadow-xl transition-all",
              checkout.isPending ? "bg-muted text-muted-foreground" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100",
            )}
          >
            {checkout.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 className="mr-2" size={18} />}
            {checkout.isPending ? "Procesando..." : "Confirmar Cobro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
