// ============================================
// POS SYSTEM - TYPE DEFINITIONS (V6.0 - REALTIME + DB-DERIVED)
// ============================================

export type { ProductInput, OrderInput, OrderStatusTransitionInput, OrderItemInput, TableInput, ConfigInput, CustomerInfoInput } from "./api-schemas";

// ── Tipos app-specific (transformados desde DB + validados con Zod) ──

// --- User & Authentication ---
export type UserRole = "admin" | "waiter" | "kitchen" | "cashier";

export interface StaffUser {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  auth_id?: string | null;
}

// --- Dynamic Product & Menu Types ---

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export type ProductSize = ProductOption;
export type ProductSauce = ProductOption;
export type ProductExtra = ProductOption;

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number; // Siempre será el precio de referencia (ej. Chico o precio base)
  category: string;
  image: string;
  available: boolean;
  preparationTime?: number;
  is_active?: boolean;

  // Flags de configuración
  hasSizes: boolean;
  sizes: ProductOption[];
  hasSauces: boolean;
  sauces: ProductOption[];
  hasExtras: boolean;
  extras: ProductOption[];
  hasSpiceLevel: boolean;
  spiceLevels: ProductOption[];
}

// --- Order & Cart Types ---

export interface OrderItemModifiers {
  size?: ProductOption;
  sauce?: ProductOption;
  spiceLevel?: string;
  extras: ProductOption[];
  // CAMBIO: Usamos 'instructions' para consistencia con OrderItem
  specialInstructions?: string;
}

// Interfaz para el objeto que sale del modal de configuración
export interface ProductSelection {
  productId: string;
  basePrice: number;
  quantity: number;
  modifiers: OrderItemModifiers;
  totalPrice: number; // Precio calculado con extras/tamaños
}

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  name: string;
  quantity: number;
  // Este es el campo que el modal lee
  instructions?: string;
  modifiers: OrderItemModifiers;
  unit_price: number;
  totalPrice: number;
  status?: OrderStatus;
  // Opcional: Para la unificación, saber CUÁNDO se añadió este item
  addedAt?: Date;
}

export type OrderType = "dine-in" | "delivery" | "take-away" | "pickup";
export type OrderStatus =
  | "pending" // Entra al sistema (Caja/Web)
  | "confirmed" // Validado por el staff
  | "preparing" // En cocina (KDS)
  | "ready" // Listo para entregar/enviar
  | "on-the-way" // Solo para delivery
  | "delivered" // Entregado al cliente
  | "completed" // Pagado y cerrado (Para el historial/log)
  | "cancelled"; // Cancelado (Para el log de mermas/errores)
export type PaymentMethod = "cash" | "card" | "transfer";
export type PaymentStatus = "pending" | "paid" | "refunded" | "partially_paid";

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
  gpsCoords?: { lat: number; lng: number };
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];

  // Identificación
  tableId?: string;
  tableNumber?: string;
  waiterId?: string;
  staffId?: string;
  /** Sesión de demo que creó la orden (solo repo demo). */
  demoSession?: string;

  // Cliente (Crucial para Delivery/Take-away)
  customerInfo?: CustomerInfo;

  // Finanzas
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee?: number;
  total: number;

  // Pago
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;

  // Tiempos
  createdAt: Date;
  acceptedAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  notes?: string;
}
// ============================================
// --- Table Management (V6.0 - HIGH SPEED FLOW) ---
// ============================================

// Estados de sala del POS (el flujo operativo usa free/occupied/billing)
export type TableStatus = "free" | "occupied" | "billing" | "reserved" | "closed";

export interface Table {
  id: string;
  number: string;
  capacity: number; // Sillas físicas reales actuales en sala
  base_seats: number;
  currentGuests: number | null; // Admite null cuando está libre
  status: TableStatus; // "free" | "occupied" | "billing" | "reserved" | "closed"
  is_active: boolean; // Bandera crucial para el desmantelamiento en cascada
  currentOrderId?: string;
  section: string;
  isJoined: boolean;
  joinedTableIds: string[];
  totalCuenta: number;
  originalConfig?: {
    number: string;
    capacity: number;
    base_seats: number;
  };
  position?: { x: number; y: number };
}

// Nueva interfaz para mapear la tabla macro de control en Supabase
export interface RestaurantConfig {
  id: string;
  sillas_respaldo: number;
  total_mesas?: number | null;
  total_sillas?: number | null;
  ops?: {
    sla_green_min?: number;
    sla_yellow_min?: number;
    caja_window_hours?: number;
  } | null;
  tax_enabled?: boolean;
  tax_rate?: number | null;
  tax_label?: string;
  created_at?: string;
}

export interface MesaCascadePayload {
  id: string;
  capacity: number;
  is_active: boolean;
  number?: string;
}

export interface GroupedOrder extends Order {
  isGroup?: boolean;
  subOrders?: Order[];
}
