"use client";

import { useMemo, useState } from "react";
import { Loader2, DollarSign, Users, ShoppingBag, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useAllOrders } from "@/hooks/use-orders";
import type { Order, PaymentMethod } from "@/lib/types";
import { CajaCheckoutDialog } from "./_components/caja-checkout-dialog";
import { summarizePayments } from "./_utils/daily-summary";

const TYPE_LABEL: Record<string, { label: string; icon: typeof ShoppingBag }> = {
  "take-away": { label: "Para Llevar", icon: ShoppingBag },
  delivery: { label: "Delivery", icon: Truck },
  pickup: { label: "Mostrador", icon: ShoppingBag },
};

const METHOD_LABEL: Record<PaymentMethod, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };

// Inicio del día local en ISO — el resumen del día filtra por fecha de cobro
// (completed_at) en el server, exento de la ventana de 48h de GET /api/orders.
function startOfTodayISO() {
  return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
}

export default function CajaPage() {
  const [checkoutTarget, setCheckoutTarget] = useState<{ orders: Order[]; label: string; tableId?: string } | null>(null);

  // Órdenes pendientes de cobro (no canceladas) + cobradas de hoy para el resumen.
  const { data: pending = [], isLoading, error } = useAllOrders({ paymentStatus: "pending" });
  const { data: paid = [] } = useAllOrders({
    paymentStatus: "paid",
    completedFrom: startOfTodayISO(),
  });

  const pendingActive = useMemo(
    () => pending.filter((o) => o.status !== "cancelled" && o.total > 0),
    [pending],
  );

  const summary = useMemo(() => summarizePayments(paid), [paid]);

  const { byTable, sinMesa } = useMemo(() => {
    const byTable = new Map<string, { id: string; number: string; orders: Order[]; total: number }>();
    const sinMesa: Order[] = [];
    for (const o of pendingActive) {
      if (o.tableId) {
        const key = o.tableId;
        const entry = byTable.get(key) ?? { id: key, number: o.tableNumber ?? "?", orders: [], total: 0 };
        entry.orders.push(o);
        entry.total += o.total;
        byTable.set(key, entry);
      } else {
        sinMesa.push(o);
      }
    }
    return { byTable: Array.from(byTable.values()).sort((a, b) => a.number.localeCompare(b.number)), sinMesa };
  }, [pendingActive]);

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Error al cargar las cuentas</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-coral" />
        <p className="text-muted-foreground animate-pulse">Cargando cuentas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy font-serif">Caja</h1>
          <p className="text-muted-foreground text-sm">Cuentas pendientes de cobro y resumen del día</p>
        </div>
      </div>

      {/* Resumen del día */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <DollarSign size={14} className="text-coral" /> Resumen del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <span className="text-3xl font-black text-navy italic tracking-tighter">${summary.total.toFixed(2)}</span>
              <span className="ml-2 text-xs text-muted-foreground font-bold uppercase">{summary.count} cobradas</span>
            </div>
            {(Object.keys(summary.byMethod) as PaymentMethod[]).map((m) => (
              <div key={m} className="text-sm">
                <span className="text-muted-foreground uppercase text-[10px] font-black">{METHOD_LABEL[m]}: </span>
                <span className="font-black text-navy">${summary.byMethod[m].toFixed(2)}</span>
              </div>
            ))}
            {summary.count === 0 && <span className="text-sm text-muted-foreground">Aún no hay cobros hoy.</span>}
          </div>
        </CardContent>
      </Card>

      {pendingActive.length === 0 ? (
        <Empty className="py-16">
          <EmptyMedia variant="icon">
            <DollarSign className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No hay cuentas pendientes</EmptyTitle>
            <EmptyDescription>Cuando una orden esté lista para cobrar aparecerá aquí.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Cuentas por mesa */}
          {byTable.map((g) => (
            <Card key={g.number} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="font-black text-navy uppercase italic flex items-center gap-2">
                    <Users size={16} className="text-coral" /> Mesa {g.number}
                  </span>
                  <Badge variant="secondary">{g.orders.length} comanda{g.orders.length > 1 ? "s" : ""}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 flex-1">
                {g.orders.map((o) => (
                  <div key={o.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">#{o.orderNumber}</span>
                    <span className="font-bold text-navy">${o.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-dashed pt-2 mt-auto">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Total</span>
                  <span className="font-black text-navy text-lg">${g.total.toFixed(2)}</span>
                </div>
                <Button
                  className="mt-2 bg-navy hover:bg-navy/90 font-black uppercase italic text-xs"
                  onClick={() => setCheckoutTarget({ orders: g.orders, label: `Mesa ${g.number}`, tableId: g.id })}
                >
                  Cobrar Mesa
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Órdenes sin mesa */}
          {sinMesa.map((o) => {
            const t = TYPE_LABEL[o.type] ?? { label: o.type, icon: ShoppingBag };
            const Icon = t.icon;
            return (
              <Card key={o.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="font-black text-navy uppercase italic flex items-center gap-2">
                      <Icon size={16} className="text-coral" /> {t.label} #{o.orderNumber}
                    </span>
                    {o.customerInfo?.name && <Badge variant="secondary">{o.customerInfo.name}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 flex-1">
                  {o.items.slice(0, 4).map((it) => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate">{it.quantity}x {it.name}</span>
                      <span className="font-bold text-navy">${it.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                  {o.items.length > 4 && <span className="text-[10px] text-muted-foreground">+{o.items.length - 4} más…</span>}
                  <div className="flex justify-between border-t border-dashed pt-2 mt-auto">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Total</span>
                    <span className="font-black text-navy text-lg">${o.total.toFixed(2)}</span>
                  </div>
                  <Button
                    className="mt-2 bg-navy hover:bg-navy/90 font-black uppercase italic text-xs"
                    onClick={() => setCheckoutTarget({ orders: [o], label: `${t.label} #${o.orderNumber}` })}
                  >
                    Cobrar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CajaCheckoutDialog
        orders={checkoutTarget?.orders ?? []}
        label={checkoutTarget?.label ?? ""}
        tableId={checkoutTarget?.tableId}
        isOpen={checkoutTarget !== null}
        onClose={() => setCheckoutTarget(null)}
      />
    </div>
  );
}
