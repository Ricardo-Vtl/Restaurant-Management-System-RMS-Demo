"use client";

import { useMemo, useState } from "react";
import { DollarSign, Users, ShoppingBag, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useAllOrders } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/format";
import type { Order } from "@/lib/types";
import { CajaStatsBar } from "./_components/caja-stats-bar";
import { CheckoutDialog } from "@/components/gestion/checkout-dialog";
import { AccountCardsSkeleton, LoadingRegion, StatsSkeleton } from "@/components/gestion/skeletons";
import { summarizePayments } from "./_utils/daily-summary";

const TYPE_LABEL: Record<string, { label: string; icon: typeof ShoppingBag }> = {
  "take-away": { label: "Para Llevar", icon: ShoppingBag },
  delivery: { label: "Delivery", icon: Truck },
  pickup: { label: "Mostrador", icon: ShoppingBag },
};

// Inicio del día local en ISO — el resumen del día filtra por fecha de cobro
// (completed_at) en el server, exento de la ventana de 48h de GET /api/orders.
function startOfTodayISO() {
  return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
}

export default function CajaPage() {
  const [checkoutTarget, setCheckoutTarget] = useState<{ orders: Order[]; label: string; tableId?: string } | null>(null);

  // Órdenes pendientes de cobro (no canceladas) + cobradas de hoy para el resumen.
  const { data: pending = [], isLoading: pendingLoading, error } = useAllOrders({ paymentStatus: "pending" });
  const { data: paid = [], isLoading: paidLoading } = useAllOrders({
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
          <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">Caja</h1>
        </div>
        <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
          Cuentas pendientes de cobro y resumen del día ·{" "}
          {paidLoading ? "cargando resumen del día" : `${summary.count} cobradas hoy`}
        </p>
      </div>

      {paidLoading ? <StatsSkeleton count={4} highlightedIndex={0} /> : <CajaStatsBar summary={summary} />}

      {pendingLoading ? (
        <LoadingRegion label="Cargando cuentas pendientes">
          <AccountCardsSkeleton />
        </LoadingRegion>
      ) : pendingActive.length === 0 ? (
        <Empty className="py-16">
          <EmptyMedia variant="icon">
            <DollarSign className="size-8" aria-hidden="true" />
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
                    <Users size={16} className="text-coral" aria-hidden="true" /> Mesa {g.number}
                  </span>
                  <Badge variant="secondary">
                    {g.orders.length} comanda{g.orders.length > 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 flex-1">
                {g.orders.map((o) => (
                  <div key={o.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">#{o.orderNumber}</span>
                    <span className="font-bold text-navy">{formatCurrency(o.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-dashed pt-2 mt-auto">
                  <span className="text-xs sm:text-[10px] font-black uppercase text-muted-foreground">Total</span>
                  <span className="font-black text-navy text-lg">{formatCurrency(g.total)}</span>
                </div>
                <Button
                  className="mt-2 bg-navy hover:bg-navy/90 font-black uppercase italic text-xs h-11 sm:h-9"
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
                      <Icon size={16} className="text-coral" aria-hidden="true" /> {t.label} #{o.orderNumber}
                    </span>
                    {o.customerInfo?.name && <Badge variant="secondary">{o.customerInfo.name}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 flex-1">
                  {o.items.slice(0, 4).map((it) => (
                    <div key={it.id} className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground truncate min-w-0 flex-1">
                        {it.quantity}x {it.name}
                      </span>
                      <span className="font-bold text-navy shrink-0 text-right">{formatCurrency(it.totalPrice)}</span>
                    </div>
                  ))}
                  {o.items.length > 4 && (
                    <span className="text-xs sm:text-[10px] text-muted-foreground">+{o.items.length - 4} más…</span>
                  )}
                  <div className="flex justify-between border-t border-dashed pt-2 mt-auto">
                    <span className="text-xs sm:text-[10px] font-black uppercase text-muted-foreground">Total</span>
                    <span className="font-black text-navy text-lg">{formatCurrency(o.total)}</span>
                  </div>
                  <Button
                    className="mt-2 bg-navy hover:bg-navy/90 font-black uppercase italic text-xs h-11 sm:h-9"
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

      <CheckoutDialog
        isOpen={checkoutTarget !== null}
        onClose={() => setCheckoutTarget(null)}
        label={checkoutTarget?.label ?? ""}
        total={(checkoutTarget?.orders ?? []).reduce((s, o) => s + o.total, 0)}
        orderCount={checkoutTarget?.orders.length ?? 0}
        deliveryFee={(checkoutTarget?.orders ?? []).reduce((s, o) => s + (o.deliveryFee ?? 0), 0)}
        tableId={checkoutTarget?.tableId}
        orderIds={checkoutTarget?.orders.map((o) => o.id)}
      />
    </div>
  );
}
