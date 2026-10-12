// Recorrido guiado de la demo — datos y reglas puras (sin React).
// Solo existe en este repo (demo); el proyecto original no lo tiene.

export type TourStepId =
  | "landing"
  | "acceso"
  | "login"
  | "dashboard"
  | "mesas"
  | "cocina"
  | "caja"
  | "logistica"
  | "config";

/** Condición que marca un paso como completado leyendo estado real de la app. */
export type TourAutoCondition = "authModal" | "login" | "order" | "delivered" | "paid";

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** Deep link del paso (botón "Ir"). */
  href?: string;
  /** Texto del botón "Ir". */
  cta?: string;
  auto?: TourAutoCondition;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "landing",
    title: "La landing pública",
    body: "Así ve tu cliente el menú: catálogo en vivo desde la base de datos, categorías, carrito y pedidos en línea.",
    href: "#menu",
    cta: "Ver el menú",
  },
  {
    id: "acceso",
    title: "Acceso del personal",
    body: "El panel es privado. Haz triple clic en el logo (arriba a la izquierda) para abrir el acceso con PIN.",
    auto: "authModal",
  },
  {
    id: "login",
    title: "Tu PIN de acceso",
    body: "Ingresa 123456 (admin). En el modal tienes también los PINs de mesero, cocina y caja para probar cada rol.",
    auto: "login",
  },
  {
    id: "dashboard",
    title: "Panel de control",
    body: "KPIs del día, ocupación de mesas y pedidos en curso. El menú lateral se adapta a cada rol.",
    href: "/gestion",
    cta: "Ir al panel",
  },
  {
    id: "mesas",
    title: "Mesas y comandas",
    body: "Abre la Mesa 1, agrega platillos y envía la comanda a cocina.",
    href: "/gestion/mesas",
    cta: "Abrir mesas",
    auto: "order",
  },
  {
    id: "cocina",
    title: "Cocina en vivo (KDS)",
    body: "Marca el platillo como listo y entrégalo: cocina y sala trabajan en tiempo real.",
    href: "/gestion/cocina",
    cta: "Ver cocina",
    auto: "delivered",
  },
  {
    id: "caja",
    title: "Caja y cobro",
    body: "Cobra la cuenta de la mesa (efectivo, tarjeta o transferencia) y mira el resumen del día.",
    href: "/gestion/caja",
    cta: "Ir a caja",
    auto: "paid",
  },
  {
    id: "logistica",
    title: "Inventario por recetas",
    body: "Cada venta descuenta insumos automáticamente según la receta. Revisa el libro de movimientos.",
    href: "/gestion/logistica",
    cta: "Ver inventario",
  },
  {
    id: "config",
    title: "White-label y cierre",
    body: "Nombre, colores, hero, horarios, impuestos y canales de pedido: todo sin tocar código. El código completo está en github.com/Ricardo-Vtl/restaurant-manager — gracias por probar la demo.",
    href: "/gestion/config",
    cta: "Ver configuración",
  },
];

export interface TourAutoContext {
  authModalOpen: boolean;
  loggedIn: boolean;
  hasNewOrder: boolean;
  hasDeliveredOrder: boolean;
  hasPaidOrder: boolean;
}

export function isAutoConditionMet(condition: TourAutoCondition, ctx: TourAutoContext): boolean {
  switch (condition) {
    case "authModal":
      return ctx.authModalOpen || ctx.loggedIn;
    case "login":
      return ctx.loggedIn;
    case "order":
      return ctx.hasNewOrder;
    case "delivered":
      return ctx.hasDeliveredOrder;
    case "paid":
      return ctx.hasPaidOrder;
  }
}

/** Paso que se completa cuando su condición se cumple (coherente con TOUR_STEPS[].auto). */
export const AUTO_STEP: Record<TourAutoCondition, TourStepId> = {
  authModal: "acceso",
  login: "login",
  order: "mesas",
  delivered: "cocina",
  paid: "caja",
};

export function clampStep(step: number): number {
  return Math.min(Math.max(step, 0), TOUR_STEPS.length - 1);
}

export function tourProgress(step: number): number {
  return Math.round(((clampStep(step) + 1) / TOUR_STEPS.length) * 100);
}

export interface StoredTourState {
  welcomeSeen: boolean;
  step: number;
  startedAt: string | null;
  completed: TourStepId[];
  hintShown: boolean;
  panelOpen: boolean;
}

export const DEFAULT_TOUR_STATE: StoredTourState = {
  welcomeSeen: false,
  step: 0,
  startedAt: null,
  completed: [],
  hintShown: false,
  panelOpen: false,
};

/** Lee el estado persistido sin confiar en el shape (localStorage puede traer basura). */
export function parseStoredState(raw: string | null): StoredTourState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    const ids = new Set<string>(TOUR_STEPS.map((s) => s.id));
    return {
      welcomeSeen: p.welcomeSeen === true,
      step:
        typeof p.step === "number" && Number.isFinite(p.step)
          ? clampStep(Math.trunc(p.step))
          : 0,
      startedAt: typeof p.startedAt === "string" ? p.startedAt : null,
      completed: Array.isArray(p.completed)
        ? p.completed.filter((id): id is TourStepId => typeof id === "string" && ids.has(id))
        : [],
      hintShown: p.hintShown === true,
      panelOpen: p.panelOpen === true,
    };
  } catch {
    return null;
  }
}
