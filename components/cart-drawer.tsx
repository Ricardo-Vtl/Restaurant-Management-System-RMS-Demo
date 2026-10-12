"use client";

import { useState, useMemo } from "react";
import {
  Minus,
  Plus,
  Trash2,
  MapPin,
  Store,
  CreditCard,
  Banknote,
  Building2,
  Send,
  Flame,
} from "lucide-react";
import { useCart, useOrderType } from "@/lib/store";
import type { PaymentMethod as PaymentMethodType, OrderItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Empty, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { customerInfoSchema } from "@/lib/api-schemas";
import { isOpenNow, nextOpeningText } from "@/lib/schedule";
import { useSiteConfig } from "@/hooks/use-site-config";

export function CartDrawer() {
  const { items, removeFromCart, updateCartQuantity, totalPrice, isCartOpen, setIsCartOpen, clearCart, customerInfo, setCustomerInfo } = useCart();
  const { currentOrderType, setCurrentOrderType } = useOrderType();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCustomerInfoValid = useMemo(
    () => customerInfoSchema.safeParse({
      name: formData.name,
      phone: formData.phone,
      address: currentOrderType === "delivery" ? formData.address : undefined,
    }).success,
    [formData.name, formData.phone, formData.address, currentOrderType],
  );

  // Kill switch + reglas de canal (el servidor las vuelve a validar)
  const { data: siteConfig } = useSiteConfig();
  const timezone = siteConfig?.timezone ?? "America/Mexico_City";
  const channel = currentOrderType === "delivery" ? siteConfig?.channels?.delivery : siteConfig?.channels?.pickup;
  const deliveryFee = currentOrderType === "delivery" ? (siteConfig?.channels?.delivery?.fee ?? 0) : 0;
  const minOrder = currentOrderType === "delivery" ? (siteConfig?.channels?.delivery?.min_order ?? 0) : 0;

  const orderBlockReason = useMemo(() => {
    if (siteConfig?.web_orders_enabled === false) {
      return "Los pedidos en línea están desactivados temporalmente";
    }
    if (!isOpenNow(siteConfig?.schedule, timezone, siteConfig?.closed_until)) {
      const next = nextOpeningText(siteConfig?.schedule, timezone, siteConfig?.closed_until);
      return `Fuera de horario${next ? ` · Abrimos ${next}` : ""}`;
    }
    if (channel?.enabled === false) {
      return currentOrderType === "delivery"
        ? "El delivery está desactivado por ahora"
        : "Los pedidos para recoger están desactivados por ahora";
    }
    if (minOrder > 0 && totalPrice < minOrder) {
      return `El pedido mínimo para delivery es $${minOrder.toFixed(2)}`;
    }
    return null;
  }, [siteConfig, timezone, channel?.enabled, currentOrderType, minOrder, totalPrice]);

  const handleSubmitOrder = async () => {
    const customer = customerInfoSchema.safeParse({
      name: formData.name,
      phone: formData.phone,
      address: currentOrderType === "delivery" ? formData.address : undefined,
    });
    if (!customer.success) {
      const firstError = customer.error.errors[0]?.message || "Por favor completa todos los campos obligatorios";
      toast.error(firstError);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/public-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.productId,
            name: item.name,
            quantity: item.quantity,
            modifiers: item.modifiers,
          })),
          customer: customer.data,
          type: currentOrderType,
          payment_method: paymentMethod,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error al enviar el pedido" }));
        throw new Error(body.error || "Error al enviar el pedido");
      }

      setCustomerInfo({ ...customer.data });
      clearCart();
      setIsCartOpen(false);
      setFormData({ name: "", phone: "", address: "" });
      toast.success("Pedido enviado. Te notificaremos cuando este listo.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al procesar el pedido";
      console.error("[handleSubmitOrder]", error);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatModifiers = (item: OrderItem) => {
    const parts: string[] = [];
    if (item.modifiers.size) parts.push(item.modifiers.size.name);
    if (item.modifiers.sauce) parts.push(item.modifiers.sauce.name);
    return parts.join(" | ");
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <SheetTitle className="font-serif text-xl font-bold">Tu Pedido</SheetTitle>
          <SheetDescription className="sr-only">Carrito de compras</SheetDescription>
        </div>

        <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
          {items.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <Store className="size-10 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>Tu carrito esta vacio</EmptyTitle>
                  <EmptyDescription>Agrega algunos deliciosos platillos</EmptyDescription>
                </Empty>
              ) : (
                <>
                  <div className="flex flex-col gap-3 mb-6">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 bg-muted/50 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          {/* Uso de item.name directamente para mayor seguridad */}
                          <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{formatModifiers(item)}</p>

                          {/* Corregido: Validación de spiceLevel */}
                          {item.modifiers.spiceLevel && (
                            <div className="flex items-center gap-0.5 mt-1">
                              <Flame className="size-3 text-coral" />
                              <span className="text-[10px] text-coral font-bold uppercase">
                                {item.modifiers.spiceLevel}
                              </span>
                            </div>
                          )}

                          {item.modifiers.extras.length > 0 && (
                            <p className="text-xs text-coral mt-1">
                              + {item.modifiers.extras.map((e) => e.name).join(", ")}
                            </p>
                          )}
                          {item.modifiers.specialInstructions && (
                            <p className="text-xs text-muted-foreground italic mt-1 truncate">
                              Nota: {item.modifiers.specialInstructions}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <span className="font-bold text-coral">${item.totalPrice.toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              aria-label={item.quantity === 1 ? "Eliminar artículo" : "Reducir cantidad"}
                              className="size-7 rounded-full border border-border flex items-center justify-center hover:border-coral transition-colors"
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="size-3 text-destructive" aria-hidden="true" />
                              ) : (
                                <Minus className="size-3" aria-hidden="true" />
                              )}
                            </button>
                            <span className="w-5 text-center font-medium text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              aria-label="Aumentar cantidad"
                              className="size-7 rounded-full border border-border flex items-center justify-center hover:border-coral transition-colors"
                            >
                              <Plus className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-3 block">Tipo de entrega</Label>
                    <RadioGroup value={currentOrderType} onValueChange={(v) => setCurrentOrderType(v as "delivery" | "pickup")} className="flex bg-muted rounded-xl p-1">
                      <div className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all text-sm", currentOrderType === "delivery" ? "bg-card shadow text-foreground" : "text-muted-foreground")}>
                        <RadioGroupItem value="delivery" id="delivery" className="sr-only" />
                        <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer"><MapPin className="size-4" /> Domicilio</Label>
                      </div>
                      <div className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all text-sm", currentOrderType === "pickup" ? "bg-card shadow text-foreground" : "text-muted-foreground")}>
                        <RadioGroupItem value="pickup" id="pickup" className="sr-only" />
                        <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer"><Store className="size-4" /> Recoger</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-4 mb-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">
                        Nombre
                      </Label>
                      <Input
                        id="name"
                        placeholder="Tu nombre"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        WhatsApp
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Ej. 521234567890"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                    {currentOrderType === "delivery" && (
                      <div>
                        <Label htmlFor="address" className="text-sm font-medium">
                          Direccion
                        </Label>
                        <Input
                          id="address"
                          placeholder="Calle, numero, colonia"
                          value={formData.address}
                          onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-3 block">Metodo de pago</Label>
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)} className="grid grid-cols-3 gap-2">
                      {[
                        { id: "cash" as PaymentMethodType, icon: Banknote, label: "Efectivo" },
                        { id: "card" as PaymentMethodType, icon: CreditCard, label: "Tarjeta" },
                        { id: "transfer" as PaymentMethodType, icon: Building2, label: "Transferencia" },
                      ].map((method) => (
                        <div
                          key={method.id}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                            paymentMethod === method.id
                              ? "border-coral bg-coral/10"
                              : "border-border hover:border-coral/50",
                          )}
                        >
                          <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                          <Label htmlFor={method.id} className="flex flex-col items-center gap-1 cursor-pointer">
                            <method.icon className="size-5" />
                            <span className="text-xs">{method.label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>

            {items.length > 0 && (
              <>
              <Separator />
              <div className="p-4 bg-card">
                {deliveryFee > 0 && (
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="text-foreground">${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    ${(totalPrice + deliveryFee).toFixed(2)} MXN
                  </span>
                </div>
                {orderBlockReason && (
                  <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                    {orderBlockReason}
                  </p>
                )}
                <Button
                  onClick={handleSubmitOrder}
                  disabled={!isCustomerInfoValid || isSubmitting || !!orderBlockReason}
                  className="w-full h-14 bg-success hover:bg-success/90 text-white text-lg font-medium rounded-xl shadow-lg disabled:opacity-50"
                >
                  <Send className="size-5 mr-2" />
                  Confirmar Pedido
                </Button>
              </div>
            </>
            )}
        </SheetContent>
    </Sheet>
  );
}
