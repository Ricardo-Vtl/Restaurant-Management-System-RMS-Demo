"use client";

import { useMemo, useState } from "react";
import { Eye, ShoppingBag, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderSourceBadge } from "./order-source-badge";
import { formatCurrency, formatElapsed, getOrderDurationSeconds } from "../_utils/order-helpers";
import { ACTIVE_STATUSES } from "@/lib/status-transitions";
import type { Order, OrderStatus } from "@/lib/types";

const PAGE_SIZE = 15;

interface OrderTableViewProps {
  orders: Order[];
  search: string;
  onSelectOrder: (id: string) => void;
}

function formatHistoryDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTableView({ orders, search, onSelectOrder }: OrderTableViewProps) {
  const [page, setPage] = useState(1);

  const allOrders = useMemo(() => {
    let result = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status as OrderStatus));
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toString().includes(search) ||
          o.tableNumber?.toLowerCase().includes(s) ||
          o.customerInfo?.name?.toLowerCase().includes(s),
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(allOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageOrders = allOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (safePage !== page) setPage(safePage);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl border border-border shadow-xl overflow-hidden">
      {/* Móvil — tarjetas apiladas */}
      <div className="flex-1 min-h-0 overflow-auto md:hidden">
        <div className="flex flex-col gap-3 p-3">
          {pageOrders.length > 0 ? (
            pageOrders.map((order) => (
              <OrderHistoryCard key={order.id} order={order} onSelectOrder={onSelectOrder} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-20">
              <ShoppingBag size={40} className="mb-3 text-navy" aria-hidden="true" />
              <p className="font-black uppercase text-xs sm:text-[10px] italic tracking-widest text-navy">
                {search ? "Sin resultados" : "Sin pedidos completados"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Escritorio/tablet — tabla */}
      <div className="hidden md:block flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow className="border-none">
              <TableHead className="pl-6 text-xs sm:text-[10px] font-black uppercase text-muted-foreground italic">
                Orden
              </TableHead>
              <TableHead className="text-xs sm:text-[10px] font-black uppercase text-muted-foreground italic">
                Origen
              </TableHead>
              <TableHead className="text-xs sm:text-[10px] font-black uppercase text-muted-foreground italic">
                Detalles
              </TableHead>
              <TableHead className="text-xs sm:text-[10px] font-black uppercase text-muted-foreground italic">
                Estado
              </TableHead>
              <TableHead className="text-xs sm:text-[10px] font-black uppercase text-muted-foreground italic text-center">
                Duración
              </TableHead>
              <TableHead className="text-xs sm:text-[10px] font-black uppercase text-muted-foreground italic">
                Total
              </TableHead>
              <TableHead className="pr-6 text-right text-xs sm:text-[10px] font-black uppercase text-muted-foreground italic">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageOrders.length > 0 ? (
              pageOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="group hover:bg-muted/80 border-border/30 transition-all"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-navy text-sm italic tracking-tighter">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs sm:text-[8px] font-bold text-muted-foreground uppercase leading-none mt-1">
                        {formatHistoryDate(order.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderSourceBadge type={order.type} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-navy uppercase">
                        {order.type === "dine-in"
                          ? `Mesa ${order.tableNumber}`
                          : order.customerInfo?.name || "Cliente"}
                      </span>
                      <span className="text-xs sm:text-[9px] font-bold text-muted-foreground italic">
                        {order.items.length} productos
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground tabular-nums">
                      <Clock size={12} aria-hidden="true" />
                      {formatElapsed(getOrderDurationSeconds(order))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-black text-navy text-sm italic">
                      {formatCurrency(order.total)}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ver detalle de orden #${order.orderNumber}`}
                      onClick={() => onSelectOrder(order.id)}
                      className="size-9 rounded-xl text-muted-foreground hover:text-navy hover:bg-white border border-transparent hover:border-border transition-all"
                    >
                      <Eye size={16} aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center opacity-20">
                    <ShoppingBag size={40} className="mb-3 text-navy" aria-hidden="true" />
                    <p className="font-black uppercase text-xs sm:text-[10px] italic tracking-widest text-navy">
                      {search ? "Sin resultados" : "Sin pedidos completados"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {allOrders.length > PAGE_SIZE && (
        <div className="shrink-0 flex items-center justify-between px-6 py-2.5 border-t border-border bg-muted/30">
          <span className="text-xs sm:text-[10px] font-bold text-muted-foreground uppercase italic">
            Pagina {safePage} de {totalPages} &mdash; {allOrders.length} pedidos
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              aria-label="Página anterior"
              onClick={() => setPage((p) => p - 1)}
              className="h-7 rounded-lg text-xs sm:text-[10px] font-black uppercase italic px-2.5"
            >
              <ChevronLeft size={14} className="mr-0.5" aria-hidden="true" />
              Ant
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              aria-label="Página siguiente"
              onClick={() => setPage((p) => p + 1)}
              className="h-7 rounded-lg text-xs sm:text-[10px] font-black uppercase italic px-2.5"
            >
              Sig
              <ChevronRight size={14} className="ml-0.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderHistoryCard({
  order,
  onSelectOrder,
}: {
  order: Order;
  onSelectOrder: (id: string) => void;
}) {
  const detail = order.type === "dine-in" ? `Mesa ${order.tableNumber}` : order.customerInfo?.name || "Cliente";

  return (
    <button
      type="button"
      onClick={() => onSelectOrder(order.id)}
      aria-label={`Ver detalle de orden #${order.orderNumber}`}
      className="w-full text-left rounded-xl border border-border bg-white p-3 flex flex-col gap-2.5 shadow-sm transition-all hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-navy text-sm italic tracking-tighter">
          #{order.orderNumber}
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <OrderSourceBadge type={order.type} />
        <span className="text-xs font-black text-navy uppercase truncate min-w-0">{detail}</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground tabular-nums shrink-0">
          <Clock size={12} aria-hidden="true" />
          {formatElapsed(getOrderDurationSeconds(order))}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 pt-2 border-t border-border/50">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-navy">{order.items.length} productos</span>
          <span className="text-xs sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            {formatHistoryDate(order.createdAt)}
          </span>
        </div>
        <span className="font-black text-navy text-base italic shrink-0">
          {formatCurrency(order.total)}
        </span>
      </div>
    </button>
  );
}
