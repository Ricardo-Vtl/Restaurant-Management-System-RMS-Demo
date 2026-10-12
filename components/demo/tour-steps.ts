// Recorrido guiado de la demo — datos y reglas puras (sin React).
// Solo existe en este repo (demo); el proyecto original no lo tiene.

export type TourStepId =
  | "landing"
  | "acceso"
  | "login"
  | "dashboard"
  | "mesas-link"
  | "mesa-1"
  | "mesa-confirm"
  | "product"
  | "add-item"
  | "send"
  | "cocina-link"
  | "kds-ready"
  | "pedidos-link"
  | "deliver-open"
  | "deliver"
  | "caja-link"
  | "cobrar"
  | "logistica"
  | "config"
  | "cierre";

/** Condición que marca un paso como completado leyendo estado real de la app. */
export type TourAutoCondition = "authModal" | "login" | "order" | "delivered" | "paid";

export interface TourTarget {
  /** Selector CSS (preferido: estable). */
  selector?: string;
  /** Texto visible o aria-label de un control (match exacto, luego parcial). */
  text?: string;
}

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** Ruta del módulo: el tour navega solo cuando el paso se activa. */
  href?: string;
  /** Elemento que ilumina el spotlight (hueco exacto). */
  target?: TourTarget;
  /** Radio del recorte en px (9999 = círculo perfecto, para logos). */
  radius?: number;
  /** Etiqueta anclada al elemento (default "Haz clic aquí"). */
  label?: string;
  /** Completa cuando este elemento aparece en el DOM. */
  completeWhen?: TourTarget;
  /** Completa cuando este elemento desaparece (tras haber aparecido). */
  completeWhenGone?: TourTarget;
  /** Completa cuando la ruta actual es el href (click del usuario en el link). */
  completeOnRoute?: boolean;
  auto?: TourAutoCondition;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "landing",
    title: "La landing pública",
    body: "Así ve tu cliente el menú: catálogo en vivo desde la base de datos, categorías, carrito y pedidos en línea.",
    href: "#menu",
    target: { selector: "#menu" },
    label: "Explora el menú",
  },
  {
    id: "acceso",
    title: "Acceso del personal",
    body: "El panel es privado: haz triple clic en el logo y se abre el teclado de PIN.",
    href: "/",
    target: { selector: "[data-demo-logo]" },
    radius: 9999,
    label: "Triple clic aquí",
    auto: "authModal",
  },
  {
    id: "login",
    title: "Tu PIN de acceso",
    body: "Ingresa 123456 (admin). En el modal tienes también los PINs de mesero, cocina y caja.",
    href: "/",
    target: { selector: '[role="dialog"]' },
    radius: 24,
    label: "Usa 123456",
    auto: "login",
  },
  {
    id: "dashboard",
    title: "Panel de control",
    body: "KPIs del día, ocupación de mesas y pedidos en curso. El menú lateral se adapta a cada rol.",
    href: "/gestion",
    target: { selector: "aside" },
    radius: 24,
    label: "Tu menú de módulos",
  },
  {
    id: "mesas-link",
    title: "Abre Mesas",
    body: "Empecemos por el mapa de mesas.",
    href: "/gestion/mesas",
    target: { selector: 'a[href="/gestion/mesas"]' },
    label: "Haz clic en Mesas",
    completeOnRoute: true,
  },
  {
    id: "mesa-1",
    title: "Abre la Mesa 1",
    body: "Cada mesa libre se abre desde su tarjeta.",
    href: "/gestion/mesas",
    target: { text: "Mesa 1" },
    completeWhen: { text: "Confirmar y Abrir" },
  },
  {
    id: "mesa-confirm",
    title: "Asigna los comensales",
    body: "Confirma y abre la mesa (4 comensales por defecto).",
    href: "/gestion/mesas",
    target: { text: "Confirmar y Abrir" },
    label: "Confirma la mesa",
    completeWhen: { text: "Enviar a Cocina" },
  },
  {
    id: "product",
    title: "Agrega un platillo",
    body: "Toca un platillo del menú de la mesa para configurarlo.",
    href: "/gestion/mesas",
    target: { text: "Aguachile Tradicional" },
    label: "Elige un platillo",
    completeWhen: { text: "Añadir a la Mesa" },
  },
  {
    id: "add-item",
    title: "Añade a la comanda",
    body: "Ajusta complementos si quieres y añádelo a la mesa.",
    href: "/gestion/mesas",
    target: { text: "Añadir a la Mesa" },
    label: "Añádelo a la mesa",
    completeWhen: { text: "Eliminar artículo del carrito" },
  },
  {
    id: "send",
    title: "Envía a cocina",
    body: "La comanda aparece al instante en el KDS y descuenta inventario por receta.",
    href: "/gestion/mesas",
    target: { text: "Enviar a Cocina" },
    label: "Envía la comanda",
    auto: "order",
  },
  {
    id: "cocina-link",
    title: "Cocina en vivo (KDS)",
    body: "La comanda ya está en preparación.",
    href: "/gestion/cocina",
    target: { selector: 'a[href="/gestion/cocina"]' },
    label: "Ve a Cocina",
    completeOnRoute: true,
  },
  {
    id: "kds-ready",
    title: "Marca el platillo como listo",
    body: "Cuando esté listo, márcalo en el KDS.",
    href: "/gestion/cocina",
    target: { text: "como listo" },
    label: "Marca listo",
    completeWhenGone: { text: "como listo" },
  },
  {
    id: "pedidos-link",
    title: "Entrega el pedido",
    body: "El pedido listo espera en Pedidos.",
    href: "/gestion/pedidos",
    target: { selector: 'a[href="/gestion/pedidos"]' },
    label: "Ve a Pedidos",
    completeOnRoute: true,
  },
  {
    id: "deliver-open",
    title: "Abre el detalle",
    body: "Mira el pedido y sus platillos.",
    href: "/gestion/pedidos",
    target: { text: "Ver" },
    label: "Abre el pedido",
    completeWhen: { text: "→ Entregado" },
  },
  {
    id: "deliver",
    title: "Márcalo como entregado",
    body: "Entregado el pedido, ya se puede cobrar.",
    href: "/gestion/pedidos",
    target: { text: "→ Entregado" },
    label: "Márcalo entregado",
    auto: "delivered",
  },
  {
    id: "caja-link",
    title: "Cobra la cuenta",
    body: "La cuenta está lista para cobrar.",
    href: "/gestion/caja",
    target: { selector: 'a[href="/gestion/caja"]' },
    label: "Ve a Caja",
    completeOnRoute: true,
  },
  {
    id: "cobrar",
    title: "Cobra la cuenta",
    body: "Elige método de pago (efectivo, tarjeta o transferencia) y confirma.",
    href: "/gestion/caja",
    target: { text: "Cobrar Mesa" },
    label: "Cobra aquí",
    auto: "paid",
  },
  {
    id: "logistica",
    title: "Inventario por recetas",
    body: "Cada venta descontó insumos automáticamente; revisa el libro de movimientos.",
    href: "/gestion/logistica",
    target: { selector: 'a[href="/gestion/logistica"]' },
    label: "Inventario",
  },
  {
    id: "config",
    title: "Todo es configurable",
    body: "Nombre, colores, hero, horarios e impuestos sin tocar código.",
    href: "/gestion/config",
    target: { selector: 'a[href="/gestion/config"]' },
    label: "White-label",
  },
  {
    id: "cierre",
    title: "¡Recorrido completado!",
    body: "Explora libremente. El código completo está en github.com/Ricardo-Vtl/restaurant-manager — gracias por probar la demo.",
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
  order: "send",
  delivered: "deliver",
  paid: "cobrar",
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
