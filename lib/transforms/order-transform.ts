import type { Json } from "@/lib/database.types";
import type { Order, OrderItem, OrderItemModifiers, OrderType, OrderStatus, PaymentStatus, PaymentMethod, CustomerInfo } from "@/lib/types";

interface OrderRow {
  id: string;
  order_number: number;
  status: string | null;
  payment_status: string | null;
  payment_method?: string | null;
  total: number | null;
  table_id: string | null;
  type: string | null;
  created_at: string | null;
  waiter_id?: string | null;
  staff_id?: string | null;
  customer_info?: Json;
  subtotal?: number | null;
  tax?: number | null;
  discount?: number | null;
  delivery_fee?: number | null;
  notes?: string | null;
  accepted_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  tables?: { number: string } | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers?: Json | null;
  status?: string | null;
  created_at?: string | null;
  products?: { name: string } | null;
}

// SQL twin de OrderRow/OrderItemRow: el SELECT que produce las filas que mapea
// dbOrderToDomain. Cada campo de OrderRow debe estar aquí (o llegar como `*`),
// si no el transform lo recibe como undefined — p. ej. payment_method sin
// seleccionar hacía que el Resumen del Día acreditara todo a "cash".
export const ORDER_SELECT = `
  id, order_number, table_id, type, status, payment_status, payment_method, total,
  subtotal, tax, discount, delivery_fee, notes, waiter_id, staff_id, customer_info,
  accepted_at, ready_at, completed_at, cancelled_at, cancel_reason, created_at,
  tables(number),
  order_items(id, order_id, product_id, quantity, unit_price, total_price, modifiers, status, created_at, products(name))
`;

function parseModifiers(raw: Json | null | undefined): OrderItemModifiers {
  if (!raw || typeof raw !== "object") return { extras: [] };
  const m = raw as Record<string, unknown>;
  return {
    size: m.size as OrderItemModifiers["size"],
    sauce: m.sauce as OrderItemModifiers["sauce"],
    spiceLevel: typeof m.spiceLevel === "string" ? m.spiceLevel : undefined,
    extras: Array.isArray(m.extras) ? (m.extras as OrderItemModifiers["extras"]) : [],
    specialInstructions: typeof m.specialInstructions === "string" ? m.specialInstructions : undefined,
  };
}

function parseCustomerInfo(raw: Json | null | undefined): CustomerInfo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  if (typeof c.name !== "string") return undefined;
  return {
    name: c.name,
    phone: typeof c.phone === "string" ? c.phone : "",
    address: typeof c.address === "string" ? c.address : undefined,
    notes: typeof c.notes === "string" ? c.notes : undefined,
  };
}

function parseTimestamp(raw?: string | null): Date | undefined {
  return raw ? new Date(raw) : undefined;
}

export function dbItemToDomain(row: OrderItemRow): OrderItem {
  const mods = parseModifiers(row.modifiers);
  return {
    id: row.id,
    productId: row.product_id,
    name: row.products?.name ?? "",
    quantity: row.quantity,
    instructions: mods.specialInstructions,
    modifiers: mods,
    unit_price: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    status: (row.status as OrderStatus) ?? undefined,
    addedAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

export function dbOrderToDomain(row: OrderRow, items?: OrderItemRow[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    type: (row.type ?? "dine-in") as OrderType,
    status: (row.status ?? "pending") as OrderStatus,
    items: items?.map(dbItemToDomain) ?? [],
    tableId: row.table_id ?? undefined,
    tableNumber: row.tables?.number ?? undefined,
    waiterId: row.waiter_id ?? undefined,
    staffId: row.staff_id ?? undefined,
    customerInfo: parseCustomerInfo(row.customer_info),
    subtotal: Number(row.subtotal ?? 0),
    tax: Number(row.tax ?? 0),
    discount: Number(row.discount ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    total: Number(row.total ?? 0),
    paymentStatus: (row.payment_status ?? "pending") as PaymentStatus,
    paymentMethod: (row.payment_method as PaymentMethod) ?? undefined,
    createdAt: new Date(row.created_at ?? Date.now()),
    acceptedAt: parseTimestamp(row.accepted_at),
    readyAt: parseTimestamp(row.ready_at),
    completedAt: parseTimestamp(row.completed_at),
    cancelledAt: parseTimestamp(row.cancelled_at),
    cancelReason: row.cancel_reason ?? undefined,
    notes: row.notes ?? undefined,
  };
}
