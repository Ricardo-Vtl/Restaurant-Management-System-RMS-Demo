"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "@/components/gestion/skeletons";
import { useOrderDetail } from "@/hooks/use-orders";
import { useOrderActions } from "../_hooks/use-order-actions";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderSourceBadge } from "./order-source-badge";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { formatCurrency, formatElapsed } from "../_utils/order-helpers";
import { getNextStatus, canTransition, canRoleTransition } from "@/lib/status-transitions";
import { can } from "@/lib/abilities";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import {
  Clock,
  MapPin,
  Phone,
  User,
  XCircle,
  Play,
  Flame,
  Droplets,
  Info,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order, OrderItem, OrderStatus, UserRole } from "@/lib/types";

interface OrderDetailPanelProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  preparing: "En Cocina",
  ready: "Listo",
  "on-the-way": "En Camino",
  delivered: "Entregado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function OrderDetailPanel({ orderId, isOpen, onClose }: OrderDetailPanelProps) {
  const { data: order, isLoading } = useOrderDetail(orderId ?? "");
  const { advance, cancel, transition, isLoading: isActionLoading } = useOrderActions();
  const currentUser = useAuthStore(useShallow((s) => s.currentUser));
  const role = currentUser?.role as UserRole | undefined;
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (!orderId) return null;

  const handleCancel = async (id: string, orderNumber: number, reason: string) => {
    await cancel(id, orderNumber, reason);
    setShowCancelDialog(false);
  };

  const nextStatus = order ? getNextStatus(order.status, order.type) : null;
  const canAdvance = order && nextStatus && canTransition(order.status, nextStatus) &&
    (!role || canRoleTransition(role, order.status, nextStatus));

  // Filter items to show only active ones (not delivered/completed)
  const activeItems = order?.items.filter((item) =>
    item.status !== "delivered" && item.status !== "completed"
  ) ?? [];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {isLoading || !order ? (
            <LoadingRegion label="Cargando orden" className="flex h-full flex-col">
              <SheetTitle className="sr-only">Cargando orden</SheetTitle>
              <SheetDescription className="sr-only">Cargando detalle de orden</SheetDescription>
              <div className="flex items-center gap-3 border-b px-6 py-4">
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-6 px-6 py-4">
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-px w-full" />
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-28" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </LoadingRegion>
          ) : (
            <div className="flex flex-col h-full">
              <SheetHeader className="shrink-0 border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-navy text-white font-black italic text-lg">
                      #{order.orderNumber}
                    </div>
                    <div>
                      <SheetTitle className="text-lg font-black italic text-navy">
                        Orden #{order.orderNumber}
                      </SheetTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <OrderStatusBadge status={order.status} />
                        <OrderSourceBadge type={order.type} />
                      </div>
                    </div>
                  </div>
                </div>
                <SheetDescription className="sr-only">
                  Detalle de orden #{order.orderNumber}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="flex-1 min-h-0 px-6 py-4">
                <div className="flex flex-col gap-6">
                  <OrderInfo order={order} />
                  <Separator />
                  <OrderTimeline order={order} />
                  <Separator />
                  <OrderItems items={activeItems} />
                  {order.notes && (
                    <>
                      <Separator />
                      <OrderNotes notes={order.notes} />
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Total</span>
                  <span className="text-2xl font-black italic text-navy">
                    {formatCurrency(order.total)}
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {canAdvance && nextStatus && (
                    <Button
                      onClick={() => advance(order)}
                      disabled={isActionLoading}
                      className="w-full sm:flex-1 h-11 rounded-xl font-black uppercase italic text-xs gap-2"
                    >
                      <Play size={16} />
                      {isActionLoading ? "Actualizando..." : `→ ${STATUS_LABELS[nextStatus]}`}
                    </Button>
                  )}
                  {can(role, "orders:cancel") && canTransition(order.status, "cancelled") && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isActionLoading}
                      className="w-full sm:w-auto h-11 rounded-xl font-black uppercase italic text-xs gap-2 px-4"
                    >
                      <XCircle size={16} />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CancelOrderDialog
        orderId={order?.id ?? null}
        orderNumber={order?.orderNumber ?? null}
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        isLoading={isActionLoading}
      />
    </>
  );
}

function OrderInfo({ order }: { order: Order }) {
  const createdAt = new Date(order.createdAt);
  const elapsed = Date.now() - createdAt.getTime();

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
        <Clock size={16} className="text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs sm:text-[10px] font-bold uppercase text-muted-foreground">Creada</p>
          <p className="text-sm font-black italic text-navy truncate">
            {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-xs sm:text-[10px] text-muted-foreground">{formatElapsed(elapsed)}</p>
        </div>
      </div>

      {order.tableNumber && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <MapPin size={16} className="text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs sm:text-[10px] font-bold uppercase text-muted-foreground">Mesa</p>
            <p className="text-sm font-black italic text-navy truncate">{order.tableNumber}</p>
          </div>
        </div>
      )}

      {order.customerInfo && (
        <>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <User size={16} className="text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs sm:text-[10px] font-bold uppercase text-muted-foreground">Cliente</p>
              <p className="text-sm font-black italic text-navy truncate">
                {order.customerInfo.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Phone size={16} className="text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs sm:text-[10px] font-bold uppercase text-muted-foreground">Telefono</p>
              <p className="text-sm font-black italic text-navy truncate">
                {order.customerInfo.phone}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const timeline = [
    { status: "pending" as OrderStatus, label: "Pendiente", time: order.createdAt },
    { status: "confirmed" as OrderStatus, label: "Confirmada", time: order.acceptedAt },
    { status: "preparing" as OrderStatus, label: "En Cocina", time: undefined },
    { status: "ready" as OrderStatus, label: "Listo", time: order.readyAt },
    { status: "delivered" as OrderStatus, label: "Entregado", time: undefined },
    { status: "completed" as OrderStatus, label: "Completado", time: order.completedAt },
  ];

  if (order.cancelledAt) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-black uppercase text-muted-foreground">Estado</p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10">
          <XCircle size={16} className="text-destructive" />
          <div>
            <p className="text-sm font-black text-destructive">Cancelada</p>
            <p className="text-xs sm:text-[10px] text-muted-foreground">
              {order.cancelReason ?? "Sin motivo"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = timeline.findIndex((t) => t.status === order.status);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-black uppercase text-muted-foreground">Progreso</p>
      <div className="flex flex-col gap-1">
        {timeline.map((step, idx) => {
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div
              key={step.status}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                isCurrent && "bg-navy/5",
              )}
            >
              <div
                className={cn(
                  "size-6 rounded-full flex items-center justify-center shrink-0",
                  isCompleted ? "bg-navy text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-bold",
                    isCurrent ? "text-navy" : "text-foreground",
                  )}
                >
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-xs sm:text-[10px] text-muted-foreground">
                    {new Date(step.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase text-muted-foreground">Items</p>
        <Badge variant="secondary" className="text-xs sm:text-[10px] font-black">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-xs font-bold text-muted-foreground italic">
            Todos los items entregados
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderItemRow({ item }: { item: OrderItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasModifiers =
    item.modifiers.size ||
    item.modifiers.sauce ||
    item.modifiers.spiceLevel ||
    item.modifiers.extras.length > 0 ||
    item.instructions;

  return (
    <div className="rounded-xl border border-border bg-white p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 font-black italic text-navy text-sm">
            {item.quantity}x
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-navy italic truncate">{item.name}</p>
            <p className="text-xs sm:text-[10px] text-muted-foreground">{formatCurrency(item.totalPrice)}</p>
          </div>
        </div>
        {hasModifiers && (
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            aria-label={expanded ? "Ocultar detalles" : "Ver detalles"}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <Info size={14} className={cn("transition-transform", expanded && "rotate-180")} />
          </Button>
        )}
      </div>

      {expanded && hasModifiers && (
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
          {item.modifiers.size && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs sm:text-[9px] font-bold uppercase">
              <Info size={10} />
              Tam: {item.modifiers.size.name}
            </div>
          )}
          {item.modifiers.sauce && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 text-xs sm:text-[9px] font-bold uppercase">
              <Droplets size={10} />
              {item.modifiers.sauce.name}
            </div>
          )}
          {item.modifiers.spiceLevel && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs sm:text-[9px] font-bold uppercase">
              <Flame size={10} />
              {item.modifiers.spiceLevel}
            </div>
          )}
          {item.modifiers.extras.map((extra, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs sm:text-[9px] font-bold uppercase"
            >
              + {extra.name}
            </div>
          ))}
          {item.instructions && (
            <div className="w-full flex items-start gap-2 p-2 rounded-lg bg-navy/5 text-navy text-xs sm:text-[10px]">
              <NotebookPen size={12} className="shrink-0 mt-0.5" />
              <p className="italic">{item.instructions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderNotes({ notes }: { notes: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-black uppercase text-muted-foreground">Notas</p>
      <div className="p-3 rounded-xl bg-muted/50 text-sm italic text-foreground">
        {notes}
      </div>
    </div>
  );
}
