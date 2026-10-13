"use client";

import { useEffect, useState } from "react";
import { Loader2, Receipt, CreditCard, Banknote, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useOrderCheckout } from "@/hooks/use-orders";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { computeTaxBreakdown } from "@/lib/pricing";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "transfer", label: "Transferencia", icon: ArrowLeftRight },
];

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  total: number;
  orderCount: number;
  deliveryFee?: number;
  tableId?: string;
  orderIds?: string[];
  onCompleted?: () => void;
}

export function CheckoutDialog({
  isOpen,
  onClose,
  label,
  total,
  orderCount,
  deliveryFee = 0,
  tableId,
  orderIds = [],
  onCompleted,
}: CheckoutDialogProps) {
  const checkout = useOrderCheckout();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  // Reset por cobro: el diálogo queda montado entre aperturas y el estado
  // persistiría — sin esto, el siguiente cobro heredaría el método anterior.
  useEffect(() => {
    if (isOpen) setMethod("cash");
  }, [isOpen]);

  const { data: config } = useRestaurantConfig();
  const taxEnabled = config?.tax_enabled ?? false;
  const breakdown = computeTaxBreakdown(total, {
    taxEnabled,
    taxRate: config?.tax_rate ?? null,
  });
  const isGroup = orderCount > 1;

  const handleConfirm = async () => {
    try {
      if (tableId) {
        // Mesa: un solo cobro atómico (todo-o-nada).
        await checkout.mutateAsync({ tableId, paymentMethod: method });
      } else {
        for (const orderId of orderIds) {
          await checkout.mutateAsync({ orderId, paymentMethod: method });
        }
      }
      toast.success(`${label} cobrada correctamente`);
      onCompleted?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cobrar");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90dvh] p-0 gap-0 overflow-hidden border-none bg-muted flex flex-col">
        <DialogHeader className="shrink-0 p-6 bg-navy text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-coral rounded-lg">
              <Receipt size={20} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">
                Cierre de Cuenta
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-[10px] font-bold text-white/70 uppercase italic">
                {label} • {orderCount} {isGroup ? "comandas" : "orden"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="bg-white border-2 border-dashed border-border rounded-2xl p-4 shadow-sm text-center">
            <span className="text-xs sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Total Final
            </span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-2xl font-black text-navy">$</span>
              <span className="text-4xl sm:text-5xl font-black text-navy italic tracking-tighter break-all">
                {total.toFixed(2)}
              </span>
            </div>
            {(deliveryFee > 0 || taxEnabled) && (
              <div className="mt-3 pt-3 border-t border-dashed border-border flex flex-col gap-1 text-left">
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Envío (incluido)</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                {taxEnabled && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(breakdown.net)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{config?.tax_label || "IVA"} incluido</span>
                      <span>{formatCurrency(breakdown.tax)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs sm:text-[10px] font-black text-navy uppercase italic">Método de Pago</p>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
              aria-label="Método de pago"
              className="grid grid-cols-3 gap-2"
            >
              {METHODS.map(({ value, label: mLabel, icon: Icon }) => (
                <label
                  key={value}
                  className={cn(
                    "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer min-w-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-coral has-[:focus-visible]:ring-offset-2",
                    method === value ? "border-navy bg-navy text-white" : "border-white bg-white text-muted-foreground",
                  )}
                >
                  <Icon size={22} aria-hidden="true" />
                  <span className="text-xs sm:text-[9px] font-black uppercase italic text-center leading-tight break-words">
                    {mLabel}
                  </span>
                  <RadioGroupItem value={value} id={`checkout-${value}`} className="sr-only" />
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={checkout.isPending}
            className={cn(
              "w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic shadow-xl transition-all",
              checkout.isPending
                ? "bg-muted text-muted-foreground"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100",
            )}
          >
            {checkout.isPending ? (
              <Loader2 className="animate-spin mr-2" size={18} aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mr-2" size={18} aria-hidden="true" />
            )}
            {checkout.isPending ? "Procesando..." : "Confirmar Cobro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
