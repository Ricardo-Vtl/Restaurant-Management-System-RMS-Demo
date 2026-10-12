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
//   • DemoAutoDismiss   — cierra el modal/panel que la app deja abierto tras una acción

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAllOrders } from "@/hooks/use-orders";
import { useAuth } from "@/lib/store";
import { useDemoTour } from "./demo-tour-context";
import { TOUR_STEPS, shouldAutoComplete, type TourAutoContext } from "./tour-steps";
import { findTargetElement } from "./target-matcher";
import { useIsDesktop } from "./use-media-query";

// Ritmo del recorrido: más margen entre acciones automáticas para que dé tiempo
// a leer (híbrido acción-trigger + tiempos holgados).
const ADVANCE_DELAY_MS = 1200;
const IDLE_ADVANCE_MS = 7000;

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
    if (shouldAutoComplete(currentStep, ctx)) complete(currentStep.id);
  }, [active, currentStep, ctx, complete]);

  return null;
}

export function DemoOrdersAutoMark() {
  const { active, state, currentStep, complete } = useDemoTour();
  const { data: orders } = useAllOrders();

  const ctx = useMemo<TourAutoContext>(() => {
    const base: TourAutoContext = {
      authModalOpen: false,
      loggedIn: true,
      hasNewOrder: false,
      hasDeliveredOrder: false,
      hasPaidOrder: false,
    };
    if (!state.startedAt || !orders) return base;

    const since = new Date(state.startedAt).getTime();
    const fresh = orders.filter((o) => o.createdAt.getTime() > since);
    return {
      ...base,
      hasNewOrder: fresh.some((o) => o.status !== "cancelled"),
      hasDeliveredOrder: fresh.some(
        (o) => o.status === "delivered" || o.status === "on-the-way" || o.status === "completed",
      ),
      hasPaidOrder: fresh.some((o) => o.paymentStatus === "paid"),
    };
  }, [orders, state.startedAt]);

  useEffect(() => {
    if (!active) return;
    if (shouldAutoComplete(currentStep, ctx)) complete(currentStep.id);
  }, [active, currentStep, ctx, complete]);

  return null;
}

export function DemoRouteAutoMark() {
  const { active, currentStep, complete } = useDemoTour();
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const href = currentStep.href;
  const isRoute = !!href && href.startsWith("/");

  // Pasos "clic en el link" en los que navega el usuario: en desktop por el
  // sidebar; en móvil el tour abre el drawer y el usuario toca el enlace real.
  const userNavigates = !!currentStep.completeOnRoute && (isDesktop || !!currentStep.needsSidebar);

  // Navegación automática al módulo del paso (solo cuando el usuario no navega).
  useEffect(() => {
    if (!active || !isRoute || !href) return;
    if (userNavigates) return;
    if (pathname !== href) router.push(href);
  }, [active, isRoute, href, pathname, router, userNavigates]);

  // Los pasos "clic en el link" se completan cuando la ruta coincide.
  useEffect(() => {
    if (!active || !isRoute || !href) return;
    if (currentStep.completeOnRoute && pathname === href) complete(currentStep.id);
  }, [active, isRoute, href, currentStep.id, currentStep.completeOnRoute, pathname, complete]);

  return null;
}

export function DemoDomAutoMark() {
  const { active, currentStep, complete } = useDemoTour();
  const seenRef = useRef(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!active) return;
    seenRef.current = false;

    // En móvil algunos targets viven en drawers ocultos (carrito): usan su señal propia.
    const completeWhen = isDesktop
      ? currentStep.completeWhen
      : currentStep.mobileCompleteWhen ?? currentStep.completeWhen;

    const check = () => {
      if (completeWhen && findTargetElement(completeWhen)) {
        complete(currentStep.id);
      }
      if (currentStep.completeWhenGone) {
        const exists = findTargetElement(currentStep.completeWhenGone) !== null;
        if (exists) seenRef.current = true;
        else if (seenRef.current) complete(currentStep.id);
      }
    };

    check();
    const id = window.setInterval(check, 250);
    return () => window.clearInterval(id);
  }, [active, currentStep, complete, isDesktop]);

  return null;
}

export function DemoAutoAdvance() {
  const { active, state, currentStep, next, finish } = useDemoTour();
  const entryRef = useRef<{ id: string; wasComplete: boolean } | null>(null);
  const isDesktop = useIsDesktop();

  // Registra si el paso ya estaba completo al entrar (evita re-avanzar al ir "Anterior").
  useEffect(() => {
    entryRef.current = {
      id: currentStep.id,
      wasComplete: state.completed.includes(currentStep.id),
    };
  }, [currentStep.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;
    const entry = entryRef.current;
    if (!entry || entry.id !== currentStep.id) return;
    // Desktop: no re-avanzar al volver con "Anterior". Móvil: siempre se recupera.
    if (entry.wasComplete && isDesktop) return;
    if (!state.completed.includes(currentStep.id)) return;

    const isLast = state.step >= TOUR_STEPS.length - 1;
    const timer = window.setTimeout(() => {
      if (isLast) finish();
      else next();
    }, ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, state.completed, state.step, currentStep.id, next, finish, isDesktop]);

  // Móvil: recorrido 100% lineal, sin navegación manual. Los pasos sin acción
  // (landing, dashboard, cierre) avanzan solos tras unos segundos.
  useEffect(() => {
    if (!active || isDesktop) return;
    const hasAction = !!(
      currentStep.auto ||
      currentStep.completeWhen ||
      currentStep.mobileCompleteWhen ||
      currentStep.completeWhenGone ||
      currentStep.completeOnRoute
    );
    if (hasAction) return;
    const isLast = state.step >= TOUR_STEPS.length - 1;
    const timer = window.setTimeout(() => {
      if (isLast) finish();
      else next();
    }, IDLE_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [active, isDesktop, currentStep, state.step, next, finish]);

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

  const needs = !isDesktop && active && !!currentStep.needsSidebar;

  useEffect(() => {
    if (isDesktop) return;

    const overlay = () => document.querySelector<HTMLElement>('[class*="bg-navy/50"]');

    if (!needs) {
      if (openedRef.current) {
        overlay()?.click();
        openedRef.current = false;
      }
      return;
    }

    let attempts = 0;
    let clicked = false;
    const tick = (): boolean => {
      if (overlay()) {
        openedRef.current = true;
        return true;
      }
      if (!clicked) {
        const btn = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Abrir menú de navegación"]',
        );
        if (btn) {
          btn.click();
          clicked = true;
          openedRef.current = true;
        }
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

  const needs = !isDesktop && active && !!currentStep.needsCart;

  useEffect(() => {
    if (isDesktop) return;

    const cartEl = () => document.querySelector<HTMLElement>('aside[aria-live="polite"]');
    // El carrito abre hacia la derecha: abierto ≈ left 0, cerrado ≈ ancho de pantalla.
    const isOpen = () => {
      const el = cartEl();
      return !!el && el.getBoundingClientRect().left < 8;
    };
    const closeCart = () =>
      document.querySelector<HTMLButtonElement>('button[aria-label="Cerrar carrito móvil"]')?.click();

    if (!needs) {
      if (openedRef.current) {
        if (isOpen()) closeCart();
        openedRef.current = false;
      }
      return;
    }

    let attempts = 0;
    let clicked = false;
    const tick = (): boolean => {
      if (isOpen()) {
        openedRef.current = true;
        return true;
      }
      if (!clicked) {
        const btn = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Abrir carrito móvil"]',
        );
        if (btn) {
          btn.click();
          clicked = true;
          openedRef.current = true;
        }
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

    // Cierra el diálogo/sheet abierto por su botón de cierre accesible. El modal
    // de mesa usa "Cerrar" y el Sheet de detalle usa "Close" (sr-only).
    const clickClose = (labels: string[]) => {
      const btn = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
      ).find((b) => labels.includes((b.textContent ?? "").trim()));
      btn?.click();
    };

    if (state.completed.includes("send") && !handledRef.current.has("send")) {
      handledRef.current.add("send");
      clickClose(["Cerrar"]);
    }

    if (state.completed.includes("deliver") && !handledRef.current.has("deliver")) {
      handledRef.current.add("deliver");
      clickClose(["Close", "Cerrar"]);
    }
  }, [active, state.completed]);

  return null;
}
