import { describe, expect, it } from "vitest";
import {
  AUTO_STEP,
  DEFAULT_TOUR_STATE,
  TOUR_STEPS,
  clampStep,
  isAutoConditionMet,
  parseStoredState,
  tourProgress,
  type TourAutoContext,
} from "@/components/demo/tour-steps";

const CTX: TourAutoContext = {
  authModalOpen: false,
  loggedIn: false,
  hasNewOrder: false,
  hasDeliveredOrder: false,
  hasPaidOrder: false,
};

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
    for (const step of TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("AUTO_STEP apunta al paso que declara cada condición", () => {
    for (const step of TOUR_STEPS) {
      if (step.auto) expect(AUTO_STEP[step.auto]).toBe(step.id);
    }
  });

  it("parseStoredState tolera basura y sanea el shape", () => {
    expect(parseStoredState(null)).toBeNull();
    expect(parseStoredState("no-json")).toBeNull();
    expect(parseStoredState('"string"')).toBeNull();

    const sane = parseStoredState(
      JSON.stringify({
        step: 999,
        completed: ["login", "hack", 7],
        startedAt: 123,
        welcomeSeen: true,
        hintShown: false,
        panelOpen: true,
      }),
    );
    expect(sane).toEqual({
      welcomeSeen: true,
      step: TOUR_STEPS.length - 1,
      startedAt: null,
      completed: ["login"],
      hintShown: false,
      panelOpen: true,
    });

    expect(parseStoredState("{}")).toEqual(DEFAULT_TOUR_STATE);
  });
});
