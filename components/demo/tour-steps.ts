// Recorrido guiado de la demo — datos y reglas puras (sin React).
// Solo existe en este repo (demo); el proyecto original no lo tiene.

import type { TourTarget } from "./target-matcher";

/** El matcher de targets es el dueño del tipo; acá se re-exporta para los pasos. */
export type { TourTarget };

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
  | "cobrar-pago"
  | "logistica"
  | "logistica-movimientos"
  | "personal-link"
  | "personal-equipo"
  | "config"
  | "config-identidad"
  | "cierre";

/** Condición que marca un paso como completado leyendo estado real de la app. */
export type TourAutoCondition = "authModal" | "login" | "order" | "delivered" | "paid";

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** Ruta del módulo: el tour navega solo cuando el paso se activa. */
  href?: string;
  /** Elemento que ilumina el spotlight (hueco exacto). El target puede vivir en
   *  un contenedor oculto (sidebar/carrito/columna del kanban): los flags
   *  `needs*` hacen que el tour lo abra o lo traiga a la vista antes. */
  target?: TourTarget;
  /** El target vive en el sidebar: en móvil el tour abre el drawer y lo resalta. */
  needsSidebar?: boolean;
  /** El target vive en el carrito: en móvil el tour abre el drawer del carrito. */
  needsCart?: boolean;
  /** El target vive en una columna de un carrusel horizontal (kanban): en móvil
   *  el tour trae esa columna a la vista antes de pedir la acción. */
  needsKanban?: boolean;
  /** En móvil muestra el bottom-sheet con "Entendido" al activarse el paso. */
  intro?: boolean;
  /** Radio del recorte en px (9999 = círculo perfecto, para logos). */
  radius?: number;
  /** Fuerza la posición del label. "inside" para objetivos de alto completo (sidebar). */
  labelPlacement?: "auto" | "inside";
  /** Etiqueta anclada al elemento (default "Haz clic aquí"). */
  label?: string;
  /** Etiqueta del spotlight en móvil (el panel suele estar cerrado). */
  mobileLabel?: string;
  /** Completa cuando este elemento aparece en el DOM. */
  completeWhen?: TourTarget;
  /** Exige que el elemento completeWhen aparezca DURANTE el paso (transición
   *  ausente→presente) en vez de valer si ya estaba presente al entrar. Evita
   *  saltos por señales ambientales (p. ej. un enlace del sidebar). */
  requireTransition?: boolean;
  /** Completa cuando este elemento desaparece (tras haber aparecido). */
  completeWhenGone?: TourTarget;
  /** Como completeWhen pero solo en móvil (target en el carrito oculto). */
  mobileCompleteWhen?: TourTarget;
  /** Completa cuando la ruta actual es el href (click del usuario en el link). */
  completeOnRoute?: boolean;
  auto?: TourAutoCondition;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "landing",
    // El tour se puede iniciar/reiniciar desde cualquier módulo: el paso 1 debe
    // llevar a la landing (sin href quedaba hablando de una pantalla que no era).
    href: "/",
    title: "La landing pública",
    body: "Así ve tu cliente el menú: catálogo en vivo desde la base de datos, categorías, carrito y pedidos en línea.",
    intro: true,
  },
  {
    id: "acceso",
    title: "Acceso del personal",
    body: "El panel es privado: haz triple clic en el logo y se abre el teclado de PIN.",
    href: "/",
    target: { selector: "[data-demo-logo]" },
    radius: 9999,
    label: "Triple clic aquí",
    intro: true,
    auto: "authModal",
  },
  {
    id: "login",
    title: "Tu PIN de acceso",
    body: "Ingresa 123456 (admin). En el modal tienes también los PINs de mesero, cocina y caja.",
    href: "/",
    target: { selector: "[data-pin-pad]" },
    radius: 16,
    label: "Usa 123456",
    auto: "login",
  },
  {
    id: "dashboard",
    title: "Panel de control",
    body: "KPIs del día, ocupación de mesas y pedidos en curso. El menú lateral se adapta a cada rol.",
    href: "/gestion",
    target: { selector: "aside" },
    needsSidebar: true,
    radius: 24,
    label: "Tu menú de módulos",
    intro: true,
  },
  {
    id: "mesas-link",
    title: "Abre Mesas",
    body: "Empecemos por el mapa de mesas.",
    href: "/gestion/mesas",
    target: { selector: 'a[href="/gestion/mesas"]' },
    needsSidebar: true,
    intro: true,
    label: "Haz clic en Mesas",
    mobileLabel: "Toca Mesas",
    completeOnRoute: true,
  },
  {
    id: "mesa-1",
    title: "Abre tu mesa",
    body: "Tu sesión reservó una mesa libre; ábrela desde su tarjeta.",
    href: "/gestion/mesas",
    target: { text: "Mesa §table" },
    label: "Toca tu mesa",
    completeWhen: { selector: '[role="dialog"]' },
  },
  {
    id: "mesa-confirm",
    title: "Asigna los comensales",
    body: "Confirma y abre la mesa (4 comensales por defecto).",
    href: "/gestion/mesas",
    target: { text: "Confirmar y Abrir" },
    label: "Confirma la mesa",
    completeWhen: { text: "Menú", within: { selector: '[role="dialog"]' } },
    requireTransition: true,
  },
  {
    id: "product",
    title: "Agrega un platillo",
    body: "Toca un platillo del menú de la mesa para configurarlo.",
    href: "/gestion/mesas",
    target: { text: "Hamburguesa Clásica" },
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
    mobileCompleteWhen: { selector: 'button[aria-label="Abrir carrito móvil"] span' },
  },
  {
    id: "send",
    title: "Envía a cocina",
    body: "La comanda aparece al instante en el KDS y descuenta inventario por receta.",
    href: "/gestion/mesas",
    target: { text: "Enviar a Cocina" },
    label: "Envía la comanda",
    needsCart: true,
    auto: "order",
  },
  {
    id: "cocina-link",
    title: "Cocina en vivo (KDS)",
    body: "La comanda ya está en preparación.",
    href: "/gestion/cocina",
    target: { selector: 'a[href="/gestion/cocina"]' },
    needsSidebar: true,
    intro: true,
    label: "Haz clic en Cocina",
    mobileLabel: "Toca Cocina",
    completeOnRoute: true,
  },
  {
    id: "kds-ready",
    title: "Marca el platillo como listo",
    body: "Cuando esté listo, márcalo en el KDS.",
    href: "/gestion/cocina",
    target: { text: "como listo", within: { text: "Mesa §table" } },
    label: "Marca listo",
    completeWhenGone: { text: "como listo", within: { text: "Mesa §table" } },
  },
  {
    id: "pedidos-link",
    title: "Entrega el pedido",
    body: "El pedido listo espera en Pedidos.",
    href: "/gestion/pedidos",
    target: { selector: 'a[href="/gestion/pedidos"]' },
    needsSidebar: true,
    intro: true,
    label: "Haz clic en Pedidos",
    mobileLabel: "Toca Pedidos",
    completeOnRoute: true,
  },
  {
    id: "deliver-open",
    title: "Abre el detalle",
    body: "Mira el pedido y sus platillos.",
    href: "/gestion/pedidos",
    target: { text: "Ver", within: { text: "Mesa §table" } },
    label: "Abre el pedido",
    needsKanban: true,
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
    needsSidebar: true,
    intro: true,
    label: "Haz clic en Caja",
    mobileLabel: "Toca Caja",
    completeOnRoute: true,
  },
  {
    id: "cobrar",
    title: "Cobra la cuenta",
    body: "Abre el cierre de cuenta de la mesa.",
    href: "/gestion/caja",
    target: { text: "Cobrar Mesa", within: { text: "Mesa §table" } },
    label: "Cobra aquí",
    completeWhen: { text: "Confirmar Cobro" },
  },
  {
    id: "cobrar-pago",
    title: "Confirma el cobro",
    body: "Elige método de pago (efectivo, tarjeta o transferencia) y confirma.",
    href: "/gestion/caja",
    target: { text: "Confirmar Cobro" },
    label: "Confirma el cobro",
    auto: "paid",
  },
  {
    id: "logistica",
    title: "Inventario por recetas",
    body: "Cada venta descontó insumos automáticamente por receta.",
    href: "/gestion/logistica",
    target: { selector: 'a[href="/gestion/logistica"]' },
    needsSidebar: true,
    intro: true,
    label: "Haz clic en Inventario",
    mobileLabel: "Toca Inventario",
    completeOnRoute: true,
  },
  {
    id: "logistica-movimientos",
    title: "El libro de movimientos",
    body: "Entradas, salidas, mermas y el descuento automático por venta quedan registrados aquí.",
    href: "/gestion/logistica",
    intro: true,
  },
  {
    id: "personal-link",
    title: "Tu equipo",
    body: "Altas, roles y PIN de acceso del personal.",
    href: "/gestion/personal",
    target: { selector: 'a[href="/gestion/personal"]' },
    needsSidebar: true,
    intro: true,
    label: "Haz clic en Personal",
    mobileLabel: "Toca Personal",
    completeOnRoute: true,
  },
  {
    id: "personal-equipo",
    title: "Altas, roles y PIN",
    body: "Da de alta empleados y asigna su rol y PIN de acceso.",
    href: "/gestion/personal",
    intro: true,
  },
  {
    id: "config",
    title: "Todo es configurable",
    body: "Nombre, colores, hero, horarios e impuestos sin tocar código.",
    href: "/gestion/config",
    target: { selector: 'a[href="/gestion/config"]' },
    needsSidebar: true,
    intro: true,
    label: "Haz clic en Config",
    mobileLabel: "Toca Configuración",
    completeOnRoute: true,
  },
  {
    id: "config-identidad",
    title: "White-label de verdad",
    body: "Identidad, horarios, canales, impuestos y operación: todo editable sin tocar código.",
    href: "/gestion/config",
    intro: true,
  },
  {
    id: "cierre",
    title: "¡Recorrido completado!",
    body: "Explora libremente. El código completo está en github.com/Ricardo-Vtl/Restaurant-Management-System-RMS-Demo — gracias por probar la demo.",
    intro: true,
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

/**
 * ¿El paso ACTUAL debe marcarse solo? Solo si declara una condición `auto` y esa
 * condición ya se cumple. Anclar al paso actual (en vez de marcar pasos futuros)
 * es lo que hace que cada acción avance el tour de forma consistente.
 */
export function shouldAutoComplete(step: TourStep, ctx: TourAutoContext): boolean {
  return step.auto ? isAutoConditionMet(step.auto, ctx) : false;
}

/**
 * ¿La condición de auto-marcado del paso pertenece a este motor? Cada motor debe
 * mirar SOLO los pasos que declara: si no, un motor con contexto simulado (p. ej.
 * el de órdenes, con `loggedIn: true` fijo) marcaba pasos de otro dominio.
 */
export function ownsAutoCondition(step: TourStep, conditions: TourAutoCondition[]): boolean {
  return step.auto !== undefined && conditions.includes(step.auto);
}

/**
 * ¿El paso avanza con una acción real del usuario? Los informacionales avanzan
 * con "Entendido"; los de acción no llevan botón de avance.
 */
export function stepHasAction(step: TourStep): boolean {
  return !!(
    step.auto ||
    step.completeWhen ||
    step.mobileCompleteWhen ||
    step.completeWhenGone ||
    step.completeOnRoute
  );
}

export function clampStep(step: number): number {
  return Math.min(Math.max(step, 0), TOUR_STEPS.length - 1);
}

export function tourProgress(step: number): number {
  return Math.round(((clampStep(step) + 1) / TOUR_STEPS.length) * 100);
}

/** Gracia antes de avisar que el objetivo del paso no está en pantalla (ms). */
export const TARGET_MISSING_GRACE_MS = 2500;

/** ¿Avisar que el objetivo del paso no aparece? (null = no se perdió) */
export function isTargetMissing(
  missingSince: number | null,
  now: number,
  graceMs: number = TARGET_MISSING_GRACE_MS,
): boolean {
  return missingSince !== null && now - missingSince >= graceMs;
}

export type AutoAdvanceDecision = "skip" | "advance" | "finish";

/**
 * Qué hace el auto-avance con el paso actual: avanzar cuando el paso está
 * completado, salvo que el usuario haya vuelto atrás a un paso ya completado
 * (si no, "Paso anterior" queda en loop). A propósito NO alcanza con "ya estaba
 * completo al entrar": con el provider remontado (cruce landing↔gestión) eso
 * dejaba el tour varado en un paso Completado sin botón para seguir.
 */
export function decideAutoAdvance(opts: {
  wentBack: boolean;
  completedOnEntry: boolean;
  isComplete: boolean;
  isLast: boolean;
}): AutoAdvanceDecision {
  if (!opts.isComplete) return "skip";
  if (opts.wentBack && opts.completedOnEntry) return "skip";
  return opts.isLast ? "finish" : "advance";
}

export interface StoredTourState {
  welcomeSeen: boolean;
  step: number;
  startedAt: string | null;
  completed: TourStepId[];
  /** Paso cuyo bottom-sheet de intro ya se confirmó con "Entendido" (móvil). */
  introAckFor: TourStepId | null;
  panelOpen: boolean;
}

export const DEFAULT_TOUR_STATE: StoredTourState = {
  welcomeSeen: false,
  step: 0,
  startedAt: null,
  completed: [],
  introAckFor: null,
  panelOpen: false,
};
