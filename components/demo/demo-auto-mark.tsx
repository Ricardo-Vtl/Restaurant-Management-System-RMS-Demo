"use client";

// Auto-marcado de pasos leyendo estado real de la app:
//   • DemoAuthAutoMark  — modal de acceso abierto / sesión iniciada (landing y gestión)
//   • DemoOrdersAutoMark — comanda creada / entregada / cobrada (solo gestión,
//     donde ya hay sesión y las órdenes son consultables)

import { useEffect, useMemo } from "react";
import { useAllOrders } from "@/hooks/use-orders";
import { useAuth } from "@/lib/store";
import { useDemoTour } from "./demo-tour-context";
import { AUTO_STEP, isAutoConditionMet, type TourAutoContext } from "./tour-steps";

export function DemoAuthAutoMark() {
  const { currentUser, isAuthModalOpen } = useAuth();
  const { active, complete } = useDemoTour();

  useEffect(() => {
    if (!active) return;
    if (isAuthModalOpen || currentUser) complete(AUTO_STEP.authModal);
    if (currentUser) complete(AUTO_STEP.login);
  }, [active, currentUser, isAuthModalOpen, complete]);

  return null;
}

export function DemoOrdersAutoMark() {
  const { active, state, complete } = useDemoTour();
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
    if (isAutoConditionMet("order", ctx)) complete(AUTO_STEP.order);
    if (isAutoConditionMet("delivered", ctx)) complete(AUTO_STEP.delivered);
    if (isAutoConditionMet("paid", ctx)) complete(AUTO_STEP.paid);
  }, [active, ctx, complete]);

  return null;
}
