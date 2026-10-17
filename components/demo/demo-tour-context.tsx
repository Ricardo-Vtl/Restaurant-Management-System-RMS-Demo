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
import {
  claimDemoTable,
  ensureDemoSession,
  releaseDemoTable,
  type DemoSession,
} from "@/lib/demo/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { demoLog } from "@/lib/demo/config";

// ponytail: estado por documento (no por navegador). El singleton de módulo se
// conserva al navegar dentro de la SPA (landing↔gestión) y se reinicia al
// recargar la página → la bienvenida siempre aparece al entrar.
let memoryState: StoredTourState | null = null;
let memorySession: DemoSession | null = null;

// Al cerrar sesión se limpia el estado del tour: evita reanudar un paso viejo
// al volver a entrar en la misma pestaña (sin recarga dura).
useAuthStore.subscribe((state, prev) => {
  if (prev.currentUser && !state.currentUser) {
    memoryState = null;
    memorySession = null;
    void releaseDemoTable();
  }
});

interface DemoTourContextValue {
  /** false hasta que el estado de módulo se hidrata (evita mismatch SSR). */
  mounted: boolean;
  state: StoredTourState;
  /** Recorrido en curso (se inició y no se finalizó). */
  active: boolean;
  currentStep: TourStep;
  /** Mesa reservada por la sesión (o null si aún no se ha reclamado). */
  session: DemoSession | null;
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
  /** El objetivo del paso actual no aparece en pantalla (lo reporta el spotlight). */
  targetMissing: boolean;
  reportTarget: (stepId: TourStepId, found: boolean) => void;
}

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredTourState>(DEFAULT_TOUR_STATE);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<DemoSession | null>(null);
  // El spotlight reporta por paso si encontró su objetivo; el panel avisa cuando no.
  const [targetState, setTargetState] = useState<{ stepId: TourStepId; found: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (memoryState) setState(memoryState);
    if (memorySession) setSession(memorySession);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    memoryState = state;
  }, [state, mounted]);

  // Reclama (o re-reclama) la mesa exclusiva de la sesión. El claim del servidor
  // libera primero la reserva previa de esta misma sesión.
  const beginSession = useCallback(async () => {
    await ensureDemoSession();
    const claimed = await claimDemoTable();
    memorySession = claimed;
    setSession(claimed);
  }, []);

  const endSession = useCallback(async () => {
    memorySession = null;
    setSession(null);
    await releaseDemoTable();
  }, []);

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
    if (!memorySession) void beginSession();
  }, [beginSession]);

  const skipWelcome = useCallback(() => {
    setState((prev) => ({ ...prev, welcomeSeen: true }));
  }, []);

  const finish = useCallback(() => {
    setState((prev) => ({ ...prev, startedAt: null, panelOpen: false, welcomeSeen: true }));
    void endSession();
  }, [endSession]);

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
    // No re-reclamar si la sesión ya tiene mesa: reiniciar en medio del recorrido
    // no debe mover la mesa (los pasos de comanda/cobro apuntarían a otra).
    if (!memorySession) void beginSession();
  }, [beginSession]);

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
    demoLog("complete", id);
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

  const reportTarget = useCallback((stepId: TourStepId, found: boolean) => {
    setTargetState((prev) =>
      prev && prev.stepId === stepId && prev.found === found ? prev : { stepId, found },
    );
  }, []);

  const value = useMemo<DemoTourContextValue>(() => {
    const currentStep = TOUR_STEPS[clampStep(state.step)];
    return {
      mounted,
      state,
      active: mounted && state.startedAt !== null,
      currentStep,
      session,
      start,
      skipWelcome,
      finish,
      reset,
      next,
      prev,
      setPanelOpen,
      complete,
      acknowledgeIntro,
      targetMissing:
        targetState !== null && targetState.stepId === currentStep.id && !targetState.found,
      reportTarget,
    };
  }, [mounted, state, session, start, skipWelcome, finish, reset, next, prev, setPanelOpen, complete, acknowledgeIntro, targetState, reportTarget]);

  return <DemoTourContext.Provider value={value}>{children}</DemoTourContext.Provider>;
}

export function useDemoTour(): DemoTourContextValue {
  const ctx = useContext(DemoTourContext);
  if (!ctx) throw new Error("useDemoTour debe usarse dentro de DemoTourProvider");
  return ctx;
}
