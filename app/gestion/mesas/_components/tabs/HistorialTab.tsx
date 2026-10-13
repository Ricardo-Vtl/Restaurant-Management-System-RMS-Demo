"use client";

import { useState, useMemo } from "react";
import { Table } from "@/lib/types";
import { useTables } from "@/hooks/use-tables";
import { useTableOrders, useUpdateOrderStatus, useCancelOrderItems, type OrderWithItems } from "@/hooks/use-orders";
import { CancelItemsDialog } from "../cancel-items-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Receipt, Clock, ChefHat, Printer, DollarSign, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Empty, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { toast } from "sonner";
import { useRestitucionMobiliario } from "../../_hooks/useRestitucionMobiliario";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import { can } from "@/lib/abilities";
import { CheckoutDialog } from "@/components/gestion/checkout-dialog";
import type { UserRole } from "@/lib/types";

interface Props {
  mesa: Table;
  onServiceCompleted: () => void;
  // 🟢 Recibimos los pools reactivos del padre para calcular la devolución atómica
  sillasRespaldoActual: number;
}

export const HistorialTab = ({ mesa, onServiceCompleted, sillasRespaldoActual }: Props) => {
  const { data: tables = [] } = useTables();
  const role = useAuthStore(useShallow((s) => s.currentUser?.role)) as UserRole | undefined;
  const canCheckout = can(role, "orders:checkout");
  const canDeliver = can(role, "orders:deliver");
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showCancelItemsDialog, setShowCancelItemsDialog] = useState(false);
  const cancelItems = useCancelOrderItems();

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-style";
    style.textContent = "@media print { nav, header, [role='banner'] { display: none !important; } }";
    document.head.appendChild(style);
    window.print();
    style.remove();
  };

  const { isRestoring, ejecutarRestitucion } = useRestitucionMobiliario({
    mesa,
    tables,
    sillasRespaldoActual,
    onServiceCompleted,
  });

  const { data: activeOrders = [], isLoading, isError } = useTableOrders(mesa.id);
  const updateStatus = useUpdateOrderStatus();
  const totalCuenta = useMemo(
    () => activeOrders.reduce((acc: number, order: OrderWithItems) => {
      const orderTotal = order.order_items
        ?.filter((item) => item.status === "delivered")
        .reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      return acc + orderTotal;
    }, 0),
    [activeOrders],
  );

  const selectedItems = useMemo(() => {
    return activeOrders
      .flatMap((order) => order.order_items || [])
      .filter((item) => selectedItemIds.has(item.id));
  }, [activeOrders, selectedItemIds]);

  const handleCancelItems = async (reason: string) => {
    if (selectedItems.length === 0) return;

    try {
      await cancelItems.mutateAsync({
        itemIds: Array.from(selectedItemIds),
      });
      
      setSelectedItemIds(new Set());
      setShowCancelItemsDialog(false);
      toast.success(`${selectedItems.length} item(s) cancelado(s)`);
    } catch (error: unknown) {
      console.error("[handleCancelItems]", error);
      const msg = error instanceof Error ? error.message : "Error al cancelar items";
      toast.error(msg);
    }
  };

  const handleMarkOrderDelivered = async (orderId: string) => {
    const order = activeOrders.find((o: OrderWithItems) => o.id === orderId);
    
    if (!order) {
      toast.error("Orden no encontrada");
      return;
    }

    if (order.status !== "ready") {
      toast.error("La orden debe estar lista para entregar");
      return;
    }

    try {
      await updateStatus.mutateAsync({ id: orderId, status: "delivered" });
      toast.success("Orden entregada");
    } catch (error: unknown) {
      console.error("[handleMarkOrderDelivered]", error);
      const msg = error instanceof Error ? error.message : "Error al actualizar estado";
      toast.error(msg);
    }
  };

  if (isLoading || isRestoring) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
        <Loader2 className="animate-spin text-coral" size={32} />
        <p className="text-xs sm:text-[10px] font-black uppercase tracking-widest text-navy">
          {isRestoring ? "Restituyendo mobiliario..." : "Consultando comanda..."}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertTriangle className="text-destructive" size={32} />
        <p className="text-xs sm:text-[10px] font-black uppercase tracking-widest text-navy">
          Error al cargar las órdenes
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-muted/50 overflow-hidden">
      {/* --- LISTADO DE PEDIDOS --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-b lg:border-b-0 lg:border-r overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xs sm:text-[10px] md:text-xs font-black text-navy uppercase italic">Consumo Total</h3>
            <p className="text-xs sm:text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase">Gestión por producto</p>
          </div>
          <Badge variant="outline" className="border-border text-navy font-black text-xs sm:text-[9px] px-2 py-0.5">
            {activeOrders.length} Comandas
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex-col gap-6 bg-white pb-20 scrollbar-hide" aria-live="polite">
          {activeOrders.length === 0 ? (
            <Empty className="opacity-20">
              <EmptyMedia>
                <ChefHat size={40} className="text-navy" />
              </EmptyMedia>
              <EmptyTitle className="text-xs sm:text-[10px] font-black uppercase tracking-widest text-navy">Mesa vacía</EmptyTitle>
            </Empty>
          ) : (
            activeOrders.map((order) => (
              <div
                key={order.id}
                className="relative pl-5 border-l-2 border-border animate-in fade-in slide-in-from-left-2"
              >
                <div className="absolute -left-2 top-0 size-3.5 rounded-full bg-muted border-2 border-white" />

                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-[10px] font-black text-navy uppercase italic">
                      Comanda #{order.id.split("-")[0]}
                    </span>
                    <span className="text-xs sm:text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(order.created_at ?? "").toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {canDeliver && order.status === "ready" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkOrderDelivered(order.id)}
                      className="h-7 rounded-lg text-xs sm:text-[9px] font-black uppercase italic text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <CheckCircle2 size={12} className="mr-1" />
                      Marcar Entregada
                    </Button>
                  )}
                  {order.status === "delivered" && (
                    <Badge variant="success" className="text-xs sm:text-[9px] font-black uppercase">
                      <CheckCircle2 size={10} className="mr-1" />
                      Entregada
                    </Badge>
                  )}
                </div>

                <div className="bg-muted rounded-xl p-1 border border-border overflow-hidden">
                  {order.order_items?.map((item) => {
                    const isDelivered = item.status === "delivered";
                    const isCancelled = item.status === "cancelled";
                    const isSelectable = !isDelivered && !isCancelled;
                    const isSelected = selectedItemIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "group flex items-center gap-2 p-3 border-b border-border/50 last:border-0 transition-colors",
                          isDelivered ? "bg-white/40" : isCancelled ? "bg-white/20" : "bg-white",
                        )}
                      >
                        {isSelectable && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedItemIds);
                              if (checked) {
                                newSet.add(item.id);
                              } else {
                                newSet.delete(item.id);
                              }
                              setSelectedItemIds(newSet);
                            }}
                            className="shrink-0"
                          />
                        )}

                        <div className="flex gap-3 min-w-0 items-start flex-1">
                          <span
                            className={cn(
                              "text-xs sm:text-[10px] font-black shrink-0 mt-0.5",
                              isDelivered ? "text-muted-foreground" : isCancelled ? "text-destructive/60" : "text-coral",
                            )}
                          >
                            {item.quantity}x
                          </span>

                          <div className="flex flex-col min-w-0">
                            <span
                              className={cn(
                                "text-xs sm:text-[11px] font-black uppercase italic truncate",
                                isDelivered ? "text-muted-foreground line-through decoration-2" : isCancelled ? "text-destructive/60 line-through decoration-2" : "text-navy",
                              )}
                            >
                              {item.products?.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs sm:text-[10px] font-black text-muted-foreground">
                            ${(item.total_price || 0).toFixed(2)}
                          </span>
                          {isDelivered && (
                            <CheckCircle2 size={14} className="text-emerald-500" aria-label="Entregado" />
                          )}
                          {isCancelled && (
                            <XCircle size={14} className="text-destructive" aria-label="Cancelado" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- SIDEBAR: RESUMEN DE CUENTA --- */}
      <aside className="w-full lg:w-80 flex flex-col bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] lg:shadow-none z-10">
        <div className="p-6 flex flex-col gap-6">
          <div className="flex lg:flex-col items-center justify-between lg:justify-center lg:text-center">
            <p className="text-xs sm:text-[9px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Cuenta Total
            </p>
            <div className="flex items-baseline lg:justify-center gap-1">
              <span className="text-lg font-black text-navy mt-2">$</span>
              <span className="text-4xl lg:text-5xl font-black text-navy italic tracking-tighter">
                {totalCuenta.toFixed(2)}
              </span>
            </div>
          </div>

          <Separator className="border-dashed border-border" />
          <div className="flex flex-col gap-3 pt-6">
            <div className="flex justify-between text-xs sm:text-[10px] font-bold uppercase text-muted-foreground italic">
              <span>Subtotal</span>
              <span className="text-navy">${totalCuenta.toFixed(2)}</span>
            </div>
            <Separator className="border-border" />
            <div className="flex justify-between text-xs sm:text-[10px] font-black pt-2 text-coral uppercase tracking-widest">
              <span>Total a cobrar</span>
              <span className="text-xs">${totalCuenta.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="h-12 border-2 border-border text-navy font-black text-xs sm:text-[10px] uppercase hover:bg-muted italic rounded-xl group"
            >
              <Printer className="mr-2 group-hover:scale-110 transition-transform" size={14} />
              Precuenta
            </Button>

            {canCheckout && (
              <Button
                disabled={totalCuenta === 0}
                onClick={() => setShowCheckout(true)}
                aria-label="Proceder al Cobro"
                aria-describedby="proceder-cobro-desc"
                className="h-14 bg-navy hover:bg-navy/90 text-white shadow-xl shadow-navy/10 rounded-xl font-black text-xs uppercase tracking-widest italic transition-all active:scale-95 flex flex-col items-center justify-center"
              >
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-coral" />
                  Proceder al Cobro
                </div>
                <span id="proceder-cobro-desc" className="text-[7px] opacity-60 font-bold normal-case italic">Finalizar y liberar mesa</span>
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* MODAL DE CHECKOUT */}
      <CheckoutDialog
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        label={`Mesa ${mesa.number}`}
        total={totalCuenta}
        orderCount={activeOrders.length}
        tableId={mesa.id}
        // Pasamos la función interceptora para empaquetar el cobro y la reorganización de mobiliario
        onCompleted={ejecutarRestitucion}
      />

      {/* BOTON FLOTANTE DE CANCELACION */}
      {selectedItemIds.size > 0 && (
        <Button
          variant="destructive"
          onClick={() => setShowCancelItemsDialog(true)}
          className="fixed bottom-24 right-4 z-40 shadow-lg rounded-xl font-black uppercase italic text-xs px-6 sm:bottom-20 sm:right-6"
        >
          <XCircle size={16} className="mr-2" />
          Cancelar {selectedItemIds.size} item(s)
        </Button>
      )}

      {/* DIALOG DE CANCELACION DE ITEMS */}
      <CancelItemsDialog
        items={selectedItems}
        isOpen={showCancelItemsDialog}
        onClose={() => setShowCancelItemsDialog(false)}
        onConfirm={handleCancelItems}
        isLoading={cancelItems.isPending}
      />
    </div>
  );
};
