import type { OrderStatus, OrderType, UserRole } from "@/lib/types";

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "on-the-way", "cancelled"],
  "on-the-way": ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

const ROLE_TRANSITIONS: Record<string, UserRole[]> = {
  "pending->confirmed": ["admin", "cashier"],
  "confirmed->preparing": ["admin", "kitchen"],
  "preparing->ready": ["admin", "kitchen"],
  "ready->delivered": ["admin", "cashier", "waiter"],
  "ready->on-the-way": ["admin", "cashier"],
  "on-the-way->delivered": ["admin", "cashier"],
  "delivered->completed": ["admin", "cashier"],
  "->cancelled": ["admin", "cashier"],
};

export const KANBAN_COLUMNS: Array<{
  id: string;
  label: string;
  statuses: OrderStatus[];
  color: "warning" | "info" | "success" | "neutral";
}> = [
  {
    id: "pending",
    label: "Pendientes",
    statuses: ["pending", "confirmed"],
    color: "warning",
  },
  {
    id: "preparing",
    label: "En Cocina",
    statuses: ["preparing"],
    color: "info",
  },
  {
    id: "ready",
    label: "Listo",
    statuses: ["ready", "on-the-way"],
    color: "success",
  },
  {
    id: "delivered",
    label: "Entregado",
    statuses: ["delivered", "completed"],
    color: "neutral",
  },
];

export const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "on-the-way",
];

// Ventana por defecto de GET /api/orders (V9-PERF-01 + fix #15): visibles los
// estados activos, lo creado recientemente y TODO lo no cobrado (sin importar
// la edad — una cuenta delivered/pending nunca debe perderse de Caja).
export function buildDefaultWindowOr(since: string): string {
  return `status.in.(${ACTIVE_STATUSES.join(",")}),created_at.gte.${since},payment_status.eq.pending`;
}

export function getNextStatus(current: OrderStatus, type: OrderType): OrderStatus | null {
  const transitions = STATUS_TRANSITIONS[current];
  if (!transitions || transitions.length === 0) return null;

  if (current === "ready") {
    return type === "delivery" ? "on-the-way" : "delivered";
  }

  const firstNonCancel = transitions.find((s) => s !== "cancelled");
  return firstNonCancel ?? null;
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canRoleTransition(role: UserRole, from: OrderStatus, to: OrderStatus): boolean {
  if (to === "cancelled") {
    return ROLE_TRANSITIONS["->cancelled"]?.includes(role) ?? false;
  }
  const key = `${from}->${to}`;
  return ROLE_TRANSITIONS[key]?.includes(role) ?? false;
}
