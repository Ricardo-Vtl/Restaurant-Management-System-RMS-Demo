import { describe, expect, it } from "vitest";
import {
  TARGET_MISSING_GRACE_MS,
  TOUR_STEPS,
  clampStep,
  decideAutoAdvance,
  isAutoConditionMet,
  isTargetMissing,
  ownsAutoCondition,
  shouldAutoComplete,
  stepHasAction,
  tourProgress,
  type TourAutoContext,
  type TourTarget,
} from "@/components/demo/tour-steps";

const CTX: TourAutoContext = {
  authModalOpen: false,
  loggedIn: false,
  hasNewOrder: false,
  hasDeliveredOrder: false,
  hasPaidOrder: false,
};

function isValidTarget(target: TourTarget | undefined): boolean {
  if (!target) return true;
  if (!!target.selector === !!target.text) return false;
  if (target.within && !isValidTarget(target.within)) return false;
  return true;
}

describe("tour-steps", () => {
  it("las condiciones automáticas leen el estado real", () => {
    expect(isAutoConditionMet("authModal", CTX)).toBe(false);
    expect(isAutoConditionMet("authModal", { ...CTX, authModalOpen: true })).toBe(true);
    expect(isAutoConditionMet("authModal", { ...CTX, loggedIn: true })).toBe(true);
    expect(isAutoConditionMet("login", { ...CTX, authModalOpen: true })).toBe(false);
    expect(isAutoConditionMet("login", { ...CTX, loggedIn: true })).toBe(true);
    expect(isAutoConditionMet("order", { ...CTX, hasNewOrder: true })).toBe(true);
    expect(isAutoConditionMet("delivered", { ...CTX, hasDeliveredOrder: true })).toBe(true);
    expect(isAutoConditionMet("paid", { ...CTX, hasPaidOrder: true })).toBe(true);
  });

  it("clampStep acota y tourProgress avanza hasta 100", () => {
    expect(clampStep(-5)).toBe(0);
    expect(clampStep(999)).toBe(TOUR_STEPS.length - 1);
    expect(tourProgress(0)).toBe(Math.round(100 / TOUR_STEPS.length));
    expect(tourProgress(TOUR_STEPS.length - 1)).toBe(100);
  });

  it("los pasos tienen ids únicos y contenido", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(15);
    for (const step of TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("los targets son selector O texto (nunca ambos ni vacíos)", () => {
    for (const step of TOUR_STEPS) {
      expect(isValidTarget(step.target)).toBe(true);
      expect(isValidTarget(step.completeWhen)).toBe(true);
      expect(isValidTarget(step.completeWhenGone)).toBe(true);
      expect(isValidTarget(step.mobileCompleteWhen)).toBe(true);
    }
  });

  it("los pasos needsKanban tienen target (columna de carrusel a traer a la vista)", () => {
    for (const step of TOUR_STEPS) {
      if (step.needsKanban) expect(step.target).toBeDefined();
    }
  });

  it("los pasos con within acotan por texto/selector válido", () => {
    for (const step of TOUR_STEPS) {
      const within = step.target?.within;
      if (within) {
        expect(within.text ?? within.selector).toBeDefined();
      }
    }
  });

  it("el paso de apertura de mesa usa un target dinámico por sesión (§table)", () => {
    const mesa = TOUR_STEPS.find((s) => s.id === "mesa-1");
    expect(mesa?.target?.text).toContain("§table");
  });

  it("mesa-confirm acota su completeWhen dentro del modal (no el sidebar)", () => {
    const step = TOUR_STEPS.find((s) => s.id === "mesa-confirm");
    expect(step?.completeWhen?.within?.selector).toContain("dialog");
  });

  it("completeOnRoute solo aplica a rutas absolutas", () => {
    for (const step of TOUR_STEPS) {
      if (step.completeOnRoute) expect(step.href?.startsWith("/")).toBe(true);
    }
  });

  it("cada condición auto la declara un solo paso", () => {
    const seen = new Map<string, string>();
    for (const step of TOUR_STEPS) {
      if (!step.auto) continue;
      expect(seen.get(step.auto)).toBeUndefined();
      seen.set(step.auto, step.id);
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("shouldAutoComplete solo marca el paso que declara la condición cumplida", () => {
    const step = (id: string) => TOUR_STEPS.find((s) => s.id === id)!;
    expect(shouldAutoComplete(step("landing"), CTX)).toBe(false);
    expect(shouldAutoComplete(step("acceso"), CTX)).toBe(false);
    expect(shouldAutoComplete(step("acceso"), { ...CTX, authModalOpen: true })).toBe(true);
    expect(shouldAutoComplete(step("login"), { ...CTX, loggedIn: true })).toBe(true);
    expect(shouldAutoComplete(step("send"), CTX)).toBe(false);
    expect(shouldAutoComplete(step("send"), { ...CTX, hasNewOrder: true })).toBe(true);
  });

  it("cada motor solo mira los pasos de su dominio", () => {
    const step = (id: string) => TOUR_STEPS.find((s) => s.id === id)!;
    expect(ownsAutoCondition(step("acceso"), ["authModal", "login"])).toBe(true);
    expect(ownsAutoCondition(step("login"), ["authModal", "login"])).toBe(true);
    expect(ownsAutoCondition(step("send"), ["order", "delivered", "paid"])).toBe(true);
    // El motor de órdenes simula loggedIn: sin el filtro marcaba pasos de login.
    expect(ownsAutoCondition(step("acceso"), ["order", "delivered", "paid"])).toBe(false);
    expect(ownsAutoCondition(step("landing"), ["authModal", "login"])).toBe(false);
  });

  it("stepHasAction cubre auto y los disparadores de DOM/ruta", () => {
    const step = (id: string) => TOUR_STEPS.find((s) => s.id === id)!;
    expect(stepHasAction(step("landing"))).toBe(false);
    expect(stepHasAction(step("acceso"))).toBe(true); // auto
    expect(stepHasAction(step("mesa-1"))).toBe(true); // completeWhen
    expect(stepHasAction(step("kds-ready"))).toBe(true); // completeWhenGone
    expect(stepHasAction(step("mesas-link"))).toBe(true); // completeOnRoute
    expect(stepHasAction(step("add-item"))).toBe(true); // mobileCompleteWhen
  });

  it("los pasos de acción tienen target (aplica el aviso de objetivo ausente)", () => {
    for (const step of TOUR_STEPS) {
      if (stepHasAction(step)) expect(step.target).toBeDefined();
    }
  });

  it("isTargetMissing avisa solo si el objetivo lleva perdido la gracia", () => {
    expect(isTargetMissing(null, 10_000)).toBe(false);
    expect(isTargetMissing(9_000, 9_000 + TARGET_MISSING_GRACE_MS - 1)).toBe(false);
    expect(isTargetMissing(9_000, 9_000 + TARGET_MISSING_GRACE_MS)).toBe(true);
  });

  it("decideAutoAdvance avanza al completar y no re-avanza al volver atrás", () => {
    const base = { wentBack: false, completedOnEntry: false, isComplete: true, isLast: false };
    expect(decideAutoAdvance({ ...base, isComplete: false })).toBe("skip");
    expect(decideAutoAdvance(base)).toBe("advance");
    expect(decideAutoAdvance({ ...base, isLast: true })).toBe("finish");
    // "Paso anterior" sobre un paso ya completado: no re-avanza (evita el loop).
    expect(decideAutoAdvance({ ...base, wentBack: true, completedOnEntry: true })).toBe("skip");
    // Volver a un paso sin completar y completarlo: avanza igual.
    expect(decideAutoAdvance({ ...base, wentBack: true, completedOnEntry: false })).toBe("advance");
  });

  it("el primer paso lleva a la landing (el tour puede iniciar en cualquier módulo)", () => {
    expect(TOUR_STEPS[0].href).toBe("/");
  });
});
