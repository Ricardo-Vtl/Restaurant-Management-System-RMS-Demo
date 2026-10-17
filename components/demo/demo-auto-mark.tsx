"use client";

// Auto-marcado y automatización del recorrido leyendo estado real de la app:
//   • DemoAuthAutoMark  — modal de acceso abierto / sesión iniciada (landing y gestión)
//   • DemoOrdersAutoMark — comanda creada / entregada / cobrada (solo gestión,
//     donde ya hay sesión y las órdenes son consultables)
//   • DemoRouteAutoMark — navega solo al módulo del paso y completa los pasos
//     cuyo avance es "el usuario hizo clic en el link" (completeOnRoute)
//   • DemoDomAutoMark   — completa cuando un elemento aparece/desaparece del DOM
//   • DemoAutoAdvance   — avanza solo tras detectar la acción del paso
//   • DemoSidebarSync   — en móvil abre/cierra el drawer para los pasos del sidebar
//   • DemoCartSync      — en móvil abre/cierra el carrito para los pasos de la comanda
//   • DemoKanbanSync    — en móvil trae a la vista la columna del kanban del paso
//   • DemoOverlaySync   — cierra overlays que tapan pasos que necesitan sidebar/carrito
//   • DemoAutoDismiss   — cierra el modal/panel que la app deja abierto tras una acción

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAllOrders } from "@/hooks/use-orders";
import { useAuth } from "@/lib/store";
import { useDemoTour } from "./demo-tour-context";
import {
  TOUR_STEPS,
  decideAutoAdvance,
  ownsAutoCondition,
  shouldAutoComplete,
  type TourAutoContext,
  type TourStepId,
} from "./tour-steps";
import { findTargetElement } from "./target-matcher";
import {
  closeOpenDialog,
  hasOpenDialog,
  isMobileCartOpen,
  isMobileSidebarOpen,
  ordersKanbanScroller,
  toggleMobileCart,
  toggleMobileSidebar,
} from "./demo-dom";
import { useIsDesktop } from "./use-media-query";
import { demoLog } from "@/lib/demo/config";

// Ritmo del recorrido: más margen entre acciones automáticas para que dé tiempo
// a leer (híbrido acción-trigger + tiempos holgados).
const ADVANCE_DELAY_MS = 800;

export function DemoAuthAutoMark() {
  const { currentUser, isAuthModalOpen } = useAuth();
  const { active, currentStep, complete } = useDemoTour();

  const ctx = useMemo<TourAutoContext>(
    () => ({
      authModalOpen: isAuthModalOpen,
      loggedIn: !!currentUser,
      hasNewOrder: false,
      hasDeliveredOrder: false,
      hasPaidOrder: false,
    }),
    [isAuthModalOpen, currentUser],
  );

  useEffect(() => {
    if (!active) return;
    // Solo los pasos de autenticación: los demás motores tienen su propio contexto.
    if (!ownsAutoCondition(currentStep, ["authModal", "login"])) return;
    if (shouldAutoComplete(currentStep, ctx)) {
      demoLog("auto:auth", currentStep.id);
      complete(currentStep.id);
    }
  }, [active, currentStep, ctx, complete]);

  return null;
}

export function DemoOrdersAutoMark() {
  const { active, state, currentStep, complete, session } = useDemoTour();
  const { data: orders } = useAllOrders();

  const ctx = useMemo<TourAutoContext>(() => {
    const base: TourAutoContext = {
      authModalOpen: false,
      loggedIn: true,
      hasNewOrder: false,
      hasDeliveredOrder: false,
      hasPaidOrder: false,
    };
    if (!orders || !session || !state.startedAt) return base;

    // Solo órdenes de ESTA sesión: posteriores al inicio del recorrido Y de la
    // mesa/sesión reclamada. Sin el corte temporal, órdenes previas de la misma
    // mesa (histórico del demo) marcarían pasos de forma prematura; sin sesión,
    // se tomarían órdenes de otras sesiones.
    const since = new Date(state.startedAt).getTime();
    const fresh = orders.filter(
      (o) =>
        o.createdAt.getTime() > since &&
        (o.demoSession ? o.demoSession === session.sessionId : o.tableId === session.tableId),
    );

    return {
      ...base,
      hasNewOrder: fresh.some((o) => o.status !== "cancelled"),
      hasDeliveredOrder: fresh.some(
        (o) => o.status === "delivered" || o.status === "on-the-way" || o.status === "completed",
      ),
      hasPaidOrder: fresh.some((o) => o.paymentStatus === "paid"),
    };
  }, [orders, session, state.startedAt]);

  useEffect(() => {
    if (!active) return;
    // Solo los pasos de órdenes: sin este filtro el contexto simulado de este
    // motor (loggedIn: true) marcaba también los pasos de login.
    if (!ownsAutoCondition(currentStep, ["order", "delivered", "paid"])) return;
    if (shouldAutoComplete(currentStep, ctx)) {
      demoLog("auto:order", currentStep.id);
      complete(currentStep.id);
    }
  }, [active, currentStep, ctx, complete]);

  return null;
}

export function DemoRouteAutoMark() {
  const { active, currentStep, complete } = useDemoTour();
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  // Paso para el que ya navegamos. Evita "perseguir" al usuario: si se va a otro
  // módulo por su cuenta, el tour no lo devuelve a la fuerza.
  const pushedForRef = useRef<TourStepId | null>(null);

  const href = currentStep.href;
  const isRoute = !!href && href.startsWith("/");

  // Pasos "clic en el link" en los que navega el usuario: en desktop por el
  // sidebar; en móvil el tour abre el drawer y el usuario toca el enlace real.
  const userNavigates = !!currentStep.completeOnRoute && (isDesktop || !!currentStep.needsSidebar);

  // Navegación al módulo del paso (solo cuando el usuario no navega): una vez al
  // activarse el paso, no en cada cambio de ruta.
  useEffect(() => {
    if (!active || !isRoute || !href) return;
    if (userNavigates) return;
    if (pathname === href) {
      pushedForRef.current = currentStep.id;
      return;
    }
    if (pushedForRef.current === currentStep.id) return;
    pushedForRef.current = currentStep.id;
    router.push(href);
  }, [active, isRoute, href, pathname, router, userNavigates, currentStep.id]);

  // Los pasos "clic en el link" se completan cuando la ruta coincide.
  useEffect(() => {
    if (!active || !isRoute || !href) return;
    if (currentStep.completeOnRoute && pathname === href) {
      demoLog("route", currentStep.id, pathname);
      complete(currentStep.id);
    }
  }, [active, isRoute, href, currentStep.id, currentStep.completeOnRoute, pathname, complete]);

  return null;
}

export function DemoDomAutoMark() {
  const { active, currentStep, complete, session } = useDemoTour();
  const seenAbsentRef = useRef(false); // completeWhen: ya estuvo ausente
  const seenPresentRef = useRef(false); // completeWhenGone: ya estuvo presente
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!active) return;
    seenAbsentRef.current = false;
    seenPresentRef.current = false;

    // En móvil algunos targets viven en drawers ocultos (carrito): usan su señal propia.
    const completeWhen = isDesktop
      ? currentStep.completeWhen
      : currentStep.mobileCompleteWhen ?? currentStep.completeWhen;

    const vars = session ? { table: session.tableNumber } : {};

    const check = () => {
      if (completeWhen) {
        const present = findTargetElement(completeWhen, { vars }) !== null;
        if (present) {
          // Si el paso exige transición, solo completa cuando el elemento
          // apareció durante el paso (evita saltos por señales ambientales).
          if (!currentStep.requireTransition || seenAbsentRef.current) {
            demoLog("dom", currentStep.id);
            complete(currentStep.id);
          }
        } else {
          seenAbsentRef.current = true;
        }
      }
      if (currentStep.completeWhenGone) {
        const exists = findTargetElement(currentStep.completeWhenGone, { vars }) !== null;
        if (exists) seenPresentRef.current = true;
        else if (seenPresentRef.current) {
          demoLog("dom:gone", currentStep.id);
          complete(currentStep.id);
        }
      }
    };

    check();
    const id = window.setInterval(check, 250);
    return () => window.clearInterval(id);
  }, [active, currentStep, complete, isDesktop, session]);

  return null;
}

export function DemoAutoAdvance() {
  const { active, state, currentStep, next, finish } = useDemoTour();
  const entryRef = useRef<{ id: TourStepId; wasComplete: boolean; wentBack: boolean } | null>(null);
  const lastIndexRef = useRef<number | null>(null);

  // Al cambiar de paso se registra si el usuario volvió con "Paso anterior" y si
  // el paso ya estaba completo al entrar (para no re-avanzar en ese caso).
  useEffect(() => {
    const prevIndex = lastIndexRef.current;
    entryRef.current = {
      id: currentStep.id,
      wasComplete: state.completed.includes(currentStep.id),
      wentBack: prevIndex !== null && state.step < prevIndex,
    };
    lastIndexRef.current = state.step;
  }, [currentStep.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;
    const entry = entryRef.current;
    if (!entry || entry.id !== currentStep.id) return;

    const decision = decideAutoAdvance({
      wentBack: entry.wentBack,
      completedOnEntry: entry.wasComplete,
      isComplete: state.completed.includes(currentStep.id),
      isLast: state.step >= TOUR_STEPS.length - 1,
    });
    if (decision === "skip") return;

    demoLog("advance", currentStep.id, "→", decision === "finish" ? "finish" : TOUR_STEPS[state.step + 1].id);
    const timer = window.setTimeout(() => {
      if (decision === "finish") finish();
      else next();
    }, ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, state.completed, state.step, currentStep.id, next, finish]);

  return null;
}

/**
 * En móvil el sidebar es un drawer oculto (breakpoint lg). Para los pasos cuyo
 * target vive en el sidebar, el tour lo abre UNA vez al activarse el paso (click
 * en la hamburguesa del header) y lo cierra al cambiar de paso. No lo reabre
 * dentro del mismo paso: si el usuario lo cierra al tocar un módulo, se queda
 * cerrado y no se encima con la siguiente indicación.
 */
export function DemoSidebarSync() {
  const { active, currentStep } = useDemoTour();
  const isDesktop = useIsDesktop();
  const openedRef = useRef(false);

  // El drawer se abre al activarse el paso (en paralelo con el bottom-sheet).
  const needs = !isDesktop && active && !!currentStep.needsSidebar;

  useEffect(() => {
    if (isDesktop) return;

    if (!needs) {
      if (openedRef.current) {
        if (isMobileSidebarOpen()) toggleMobileSidebar();
        openedRef.current = false;
      }
      return;
    }

    let attempts = 0;
    let clicked = false;
    const tick = (): boolean => {
      if (isMobileSidebarOpen()) {
        openedRef.current = true;
        return true;
      }
      // Un solo click: si se hiciera por tick, cada intento lo cerraría de nuevo.
      if (!clicked && toggleMobileSidebar()) {
        clicked = true;
        openedRef.current = true;
      }
      return false;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      attempts += 1;
      if (tick() || attempts > 12) window.clearInterval(id);
    }, 150);
    return () => window.clearInterval(id);
  }, [isDesktop, needs, currentStep.id]);

  return null;
}

/**
 * En móvil la comanda es un drawer oculto dentro del modal de la mesa. Para los
 * pasos cuyo target vive en el carrito (p. ej. "Enviar a Cocina"), el tour lo
 * abre UNA vez al activarse el paso y lo cierra al cambiar de paso.
 */
export function DemoCartSync() {
  const { active, currentStep } = useDemoTour();
  const isDesktop = useIsDesktop();
  const openedRef = useRef(false);

  // El carrito se abre al activarse el paso (en paralelo con el bottom-sheet).
  const needs = !isDesktop && active && !!currentStep.needsCart;

  useEffect(() => {
    if (isDesktop) return;

    if (!needs) {
      if (openedRef.current) {
        if (isMobileCartOpen()) toggleMobileCart();
        openedRef.current = false;
      }
      return;
    }

    let attempts = 0;
    let clicked = false;
    const tick = (): boolean => {
      if (isMobileCartOpen()) {
        openedRef.current = true;
        return true;
      }
      if (!clicked && toggleMobileCart()) {
        clicked = true;
        openedRef.current = true;
      }
      return false;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      attempts += 1;
      if (tick() || attempts > 12) window.clearInterval(id);
    }, 150);
    return () => window.clearInterval(id);
  }, [isDesktop, needs, currentStep.id]);

  return null;
}

/**
 * En móvil el kanban de Pedidos es un carrusel horizontal (snap): la columna que
 * contiene el target (p. ej. "Ver" en "Listo") puede quedar fuera de pantalla a
 * la derecha. Para los pasos que lo marcan (`needsKanban`), el tour trae esa
 * columna a la vista UNA vez al activarse el paso; después el usuario solo hace
 * el trigger de la acción.
 */
export function DemoKanbanSync() {
  const { active, currentStep, session } = useDemoTour();
  const isDesktop = useIsDesktop();

  const needs = !isDesktop && active && !!currentStep.needsKanban;
  const target = currentStep.target;
  const tableNumber = session?.tableNumber;

  useEffect(() => {
    if (!needs || !target) return;

    const scroller = ordersKanbanScroller();
    if (!scroller) return;

    const vars = tableNumber ? { table: tableNumber } : {};
    let attempts = 0;
    const tick = (): boolean => {
      // Localiza el target aunque esté oculto a la derecha (columna fuera de
      // pantalla) y desliza su columna al snap, como useSnapCarousel.goTo.
      const el = findTargetElement(target, { includeOffscreenRight: true, vars });
      const column = el
        ? Array.from(scroller.children).find((child) => child.contains(el))
        : undefined;
      if (!(column instanceof HTMLElement)) return false;

      const left =
        column.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left +
        scroller.scrollLeft;
      scroller.scrollTo({ left, behavior: "smooth" });
      return true;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      attempts += 1;
      if (tick() || attempts > 40) window.clearInterval(id);
    }, 150);
    return () => window.clearInterval(id);
  }, [needs, target, tableNumber]);

  return null;
}

/**
 * Cierra overlays que tapan el objetivo de pasos que necesitan el sidebar
 * (p. ej. el modal de mesa queda abierto si la sesión llegó a una mesa ya
 * abierta). Solo pasos de navegación: los pasos de carrito (`needsCart`) viven
 * DENTRO del modal, así que no deben cerrarlo.
 *
 * Cierra UNA vez por paso (reintenta un momento por si el modal se monta tarde):
 * antes lo hacía cada 400 ms y le cerraba al visitante cualquier diálogo que abriera.
 */
export function DemoOverlaySync() {
  const { active, currentStep } = useDemoTour();

  const needs = active && !!currentStep.needsSidebar;

  useEffect(() => {
    if (!needs) return;

    let closed = false;
    const tick = (): boolean => {
      if (closed) return true;
      if (!hasOpenDialog()) return false; // todavía no hay nada que cerrar
      closed = closeOpenDialog();
      return closed;
    };

    if (tick()) return;
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      if (tick() || attempts > 12) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [needs, currentStep.id]);

  return null;
}

/**
 * Cierra los overlays que la app deja abiertos tras completar una acción, para
 * que el foco del siguiente paso no quede detrás (desktop y móvil):
 *   • send    → cierra el modal de la mesa (comanda enviada)
 *   • deliver → cierra el panel lateral del pedido (marcado como entregado)
 */
export function DemoAutoDismiss() {
  const { active, state } = useDemoTour();
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!active) return;
    if (state.completed.length === 0) {
      handledRef.current.clear();
      return;
    }

    // Cierra el diálogo/sheet que quedó abierto tras la acción (el modal de mesa
    // y el Sheet de detalle usan su propio botón de cierre accesible).
    if (state.completed.includes("send") && !handledRef.current.has("send")) {
      handledRef.current.add("send");
      closeOpenDialog();
    }

    if (state.completed.includes("deliver") && !handledRef.current.has("deliver")) {
      handledRef.current.add("deliver");
      closeOpenDialog();
    }
  }, [active, state.completed]);

  return null;
}
