"use client";

// Estado del recorrido guiado de la demo, por documento (no persiste al recargar).
// Los componentes de cada página (landing / gestión) montan su propio provider;
// el singleton de módulo conserva el estado al navegar entre páginas.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_TOUR_STATE,
  TOUR_STEPS,
  clampStep,
  type StoredTourState,
  type TourStep,
  type TourStepId,
} from "./tour-steps";

// ponytail: estado por documento (no por navegador). El singleton de módulo se
// conserva al navegar dentro de la SPA (landing↔gestión) y se reinicia al
// recargar la página → la bienvenida siempre aparece al entrar.
let memoryState: StoredTourState | null = null;

interface DemoTourContextValue {
  /** false hasta que el estado de módulo se hidrata (evita mismatch SSR). */
  mounted: boolean;
  state: StoredTourState;
  /** Recorrido en curso (se inició y no se finalizó). */
  active: boolean;
  currentStep: TourStep;
  start: () => void;
  skipWelcome: () => void;
  finish: () => void;
  reset: () => void;
  next: () => void;
  prev: () => void;
  setPanelOpen: (open: boolean) => void;
  complete: (id: TourStepId) => void;
  /** Marca el bottom-sheet de intro del paso actual como confirmado (móvil). */
  acknowledgeIntro: () => void;
}

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredTourState>(DEFAULT_TOUR_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (memoryState) setState(memoryState);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    memoryState = state;
  }, [state, mounted]);

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      welcomeSeen: true,
      startedAt: new Date().toISOString(),
      step: 0,
      completed: [],
      introAckFor: null,
      panelOpen: true,
    }));
  }, []);

  const skipWelcome = useCallback(() => {
    setState((prev) => ({ ...prev, welcomeSeen: true }));
  }, []);

  const finish = useCallback(() => {
    setState((prev) => ({ ...prev, startedAt: null, panelOpen: false, welcomeSeen: true }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      welcomeSeen: true,
      startedAt: new Date().toISOString(),
      step: 0,
      completed: [],
      introAckFor: null,
      panelOpen: true,
    }));
  }, []);

  const next = useCallback(() => {
    setState((prev) => ({ ...prev, step: clampStep(prev.step + 1) }));
  }, []);

  const prev = useCallback(() => {
    setState((prev) => ({ ...prev, step: clampStep(prev.step - 1) }));
  }, []);

  const setPanelOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, panelOpen: open }));
  }, []);

  const complete = useCallback((id: TourStepId) => {
    setState((prev) =>
      prev.completed.includes(id) ? prev : { ...prev, completed: [...prev.completed, id] },
    );
  }, []);

  const acknowledgeIntro = useCallback(() => {
    setState((prev) => {
      const id = TOUR_STEPS[clampStep(prev.step)].id;
      return prev.introAckFor === id ? prev : { ...prev, introAckFor: id };
    });
  }, []);

  const value = useMemo<DemoTourContextValue>(() => {
    const currentStep = TOUR_STEPS[clampStep(state.step)];
    return {
      mounted,
      state,
      active: mounted && state.startedAt !== null,
      currentStep,
      start,
      skipWelcome,
      finish,
      reset,
      next,
      prev,
      setPanelOpen,
      complete,
      acknowledgeIntro,
    };
  }, [mounted, state, start, skipWelcome, finish, reset, next, prev, setPanelOpen, complete, acknowledgeIntro]);

  return <DemoTourContext.Provider value={value}>{children}</DemoTourContext.Provider>;
}

export function useDemoTour(): DemoTourContextValue {
  const ctx = useContext(DemoTourContext);
  if (!ctx) throw new Error("useDemoTour debe usarse dentro de DemoTourProvider");
  return ctx;
}
