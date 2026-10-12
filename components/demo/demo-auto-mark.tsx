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
const ADVANCE_DELAY_MS = 2500;
const IDLE_ADVANCE_MS = 8000;

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

  useEffect(() => {
    if (!active) return;
    seenRef.current = false;

    const check = () => {
      if (currentStep.completeWhen && findTargetElement(currentStep.completeWhen)) {
        complete(currentStep.id);
      }
      if (currentStep.completeWhenGone) {
        const exists = findTargetElement(currentStep.completeWhenGone) !== null;
        if (exists) seenRef.current = true;
        else if (seenRef.current) complete(currentStep.id);
      }
    };

    check();
    const id = window.setInterval(check, 500);
    return () => window.clearInterval(id);
  }, [active, currentStep, complete]);

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
    if (!entry || entry.id !== currentStep.id || entry.wasComplete) return;
    if (!state.completed.includes(currentStep.id)) return;

    const isLast = state.step >= TOUR_STEPS.length - 1;
    const timer = window.setTimeout(() => {
      if (isLast) finish();
      else next();
    }, ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, state.completed, state.step, currentStep.id, next, finish]);

  // Móvil: recorrido 100% lineal, sin navegación manual. Los pasos sin acción
  // (landing, dashboard, cierre) avanzan solos tras unos segundos.
  useEffect(() => {
    if (!active || isDesktop) return;
    const hasAction = !!(
      currentStep.auto ||
      currentStep.completeWhen ||
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
 * target vive en el sidebar, el tour abre el drawer (click programático en la
 * hamburguesa del header) y lo cierra al salir. Solo lo cierra si fue el tour
 * quien lo abrió, y no lo reabre cuando el paso ya se completó.
 */
export function DemoSidebarSync() {
  const { active, state, currentStep } = useDemoTour();
  const isDesktop = useIsDesktop();
  const openedByTourRef = useRef(false);

  const done = state.completed.includes(currentStep.id);
  const needs = !isDesktop && active && !!currentStep.needsSidebar && !done;

  useEffect(() => {
    if (isDesktop) return;

    const overlay = () => document.querySelector<HTMLElement>('[class*="bg-navy/50"]');
    const isOpen = () => !!overlay();
    const openDrawer = () =>
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Abrir menú de navegación"]')
        ?.click();

    const tick = () => {
      if (needs) {
        if (!isOpen()) {
          openDrawer();
          openedByTourRef.current = true;
        }
      } else if (openedByTourRef.current) {
        if (isOpen()) overlay()?.click();
        openedByTourRef.current = false;
      }
    };

    tick();
    const id = window.setInterval(tick, 300);
    return () => window.clearInterval(id);
  }, [isDesktop, needs]);

  return null;
}
