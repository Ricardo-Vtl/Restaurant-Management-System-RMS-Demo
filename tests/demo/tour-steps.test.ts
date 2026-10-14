import { describe, expect, it } from "vitest";
import {
  AUTO_STEP,
  TOUR_STEPS,
  clampStep,
  isAutoConditionMet,
  shouldAutoComplete,
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
      expect(isValidTarget(step.mobileTarget)).toBe(true);
    }
  });

  it("los pasos completeOnRoute tienen mobileTarget (sidebar oculto en móvil)", () => {
    for (const step of TOUR_STEPS) {
      if (step.completeOnRoute) expect(step.mobileTarget).toBeDefined();
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

  it("AUTO_STEP apunta al paso que declara cada condición", () => {
    for (const step of TOUR_STEPS) {
      if (step.auto) expect(AUTO_STEP[step.auto]).toBe(step.id);
    }
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
});
