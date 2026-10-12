"use client";

import { useMemo, useState } from "react";
import { Eye, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderTimer } from "./order-timer";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderSourceBadge } from "./order-source-badge";
import { formatCurrency } from "../_utils/order-helpers";
import { ACTIVE_STATUSES } from "@/lib/status-transitions";
import type { Order, OrderStatus } from "@/lib/types";

const PAGE_SIZE = 15;

interface OrderTableViewProps {
  orders: Order[];
  search: string;
  onSelectOrder: (id: string) => void;
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
      <ScrollArea className="flex-1 min-h-0">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow className="border-none">
              <TableHead className="pl-6 text-[10px] font-black uppercase text-muted-foreground italic">
                Orden
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">
                Origen
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">
                Detalles
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">
                Estado
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic text-center">
                Tiempo
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">
                Total
              </TableHead>
              <TableHead className="pr-6 text-right text-[10px] font-black uppercase text-muted-foreground italic">
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
                      <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none mt-1">
                        {new Date(order.createdAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                      <span className="text-[9px] font-bold text-muted-foreground italic">
                        {order.items.length} productos
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <OrderTimer order={order} />
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
                      aria-label="Ver detalle de orden"
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
                    <p className="font-black uppercase text-[10px] italic tracking-widest text-navy">
                      {search ? "Sin resultados" : "Sin pedidos completados"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {allOrders.length > PAGE_SIZE && (
        <div className="shrink-0 flex items-center justify-between px-6 py-2.5 border-t border-border bg-muted/30">
          <span className="text-[10px] font-bold text-muted-foreground uppercase italic">
            Pagina {safePage} de {totalPages} &mdash; {allOrders.length} pedidos
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 rounded-lg text-[10px] font-black uppercase italic px-2.5"
            >
              <ChevronLeft size={14} className="mr-0.5" aria-hidden="true" />
              Ant
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 rounded-lg text-[10px] font-black uppercase italic px-2.5"
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
