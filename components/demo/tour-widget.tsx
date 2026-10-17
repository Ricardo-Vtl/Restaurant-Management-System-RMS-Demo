"use client";

// Widget del recorrido guiado.
//   • Desktop (≥ md): botón + panel lateral fijo (como siempre).
//   • Móvil: sin panel siempre visible — la guía son los labels del spotlight.
//     El botón "Guía" abre el panel como bottom sheet bajo demanda, con la
//     opción de saltar el recorrido por completo.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, Compass, KeyRound, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useDemoTour } from "./demo-tour-context";
import { hasOpenDialog, hasOpenSheet } from "./demo-dom";
import { TOUR_STEPS, clampStep, stepHasAction, tourProgress } from "./tour-steps";
import { useIsDesktop } from "./use-media-query";

const PANEL_ID = "demo-tour-panel";

// Ancho del Sheet de detalle (max-w-md): cuanto se corre el panel para no taparlo.
const SHEET_SHIFT_PX = 448;

// Sondea un flag del DOM (diálogo/sheet abierto) cada 300 ms.
function usePolledFlag(check: () => boolean): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const run = () => setOpen(check());
    run();
    const id = window.setInterval(run, 300);
    return () => window.clearInterval(id);
  }, [check]);
  return open;
}

export function TourWidget() {
  const {
    mounted,
    state,
    active,
    currentStep,
    start,
    finish,
    reset,
    next,
    prev,
    setPanelOpen,
    acknowledgeIntro,
    targetMissing,
  } = useDemoTour();
  const { currentUser, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // En móvil el botón flotante taparía el teclado del PIN (o el CTA del carrito),
  // así que se oculta mientras haya un diálogo abierto. En escritorio, con un
  // Sheet lateral abierto (detalle del pedido) el panel se mueve a la izquierda.
  const dialogOpen = usePolledFlag(hasOpenDialog);
  const sheetOpen = usePolledFlag(hasOpenSheet);
  const isDesktop = useIsDesktop();
  const [mobileOpen, setMobileOpen] = useState(false);

  const total = TOUR_STEPS.length;
  const index = clampStep(state.step);
  const done = state.completed.includes(currentStep.id);
  const isLast = index === total - 1;

  // En móvil, los pasos de sección abren el sheet solos con "Entendido".
  const introPending =
    mounted && !isDesktop && active && !!currentStep.intro && state.introAckFor !== currentStep.id;
  const open = mounted && (isDesktop ? state.panelOpen : mobileOpen || introPending);

  const hasAction = stepHasAction(currentStep);
  // En pasos de acción el botón no avanza (sólo cierra el sheet de intro): se
  // etiqueta como tal para no prometer un avance que no ocurre.
  const hidesOnly = hasAction && !introPending;
  const sheetShiftX = isDesktop && sheetOpen ? -SHEET_SHIFT_PX : 0;

  const closePanel = () => {
    // Devuelve el foco al botón que abrió el panel (WCAG 2.4.3).
    const hadFocus = !!panelRef.current?.contains(document.activeElement);
    if (isDesktop) setPanelOpen(false);
    else setMobileOpen(false);
    if (hadFocus) requestAnimationFrame(() => toggleRef.current?.focus());
  };

  // El bottom sheet no debe quedar sobre un modal: se cierra al abrirse uno.
  useEffect(() => {
    if (dialogOpen && !isDesktop) setMobileOpen(false);
  }, [dialogOpen, isDesktop]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!mounted) return null;

  const handleStart = () => {
    start();
    if (!isDesktop) setMobileOpen(false);
  };

  const handleSkip = () => {
    finish();
    setMobileOpen(false);
  };

  const handleUnderstood = () => {
    acknowledgeIntro();
    setMobileOpen(false);
    // Si el paso no se completa por acción, "Entendido" avanza (o finaliza).
    if (!hasAction) {
      if (isLast) finish();
      else next();
    }
  };

  return (
    <>
      {!dialogOpen && !introPending && (
        <button
          ref={toggleRef}
          type="button"
          onClick={() => (isDesktop ? setPanelOpen(!state.panelOpen) : setMobileOpen((v) => !v))}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          aria-label={open ? "Cerrar la guía de la demo" : "Abrir la guía de la demo"}
          className={cn(
            "fixed bottom-6 left-6 lg:left-auto lg:right-6 z-[70] size-14 rounded-full bg-coral text-accent-foreground shadow-2xl shadow-coral/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral",
            active && !done && "animate-pulse-coral",
          )}
        >
          <Compass className="size-6" aria-hidden="true" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.section
            id={PANEL_ID}
            ref={panelRef}
            tabIndex={-1}
            role="region"
            aria-label="Recorrido guiado de la demo"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, x: sheetShiftX }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "fixed z-[70] border-coral/30 bg-card shadow-2xl focus-visible:outline-none",
              // Móvil: bottom sheet
              "bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t p-5",
              // Desktop: panel lateral. Si hay un Sheet derecho abierto (detalle
              // del pedido), se corre a la izquierda para no taparlo.
              "lg:bottom-24 lg:max-h-[calc(100dvh-8rem)] lg:w-96 lg:rounded-2xl lg:border lg:left-auto lg:right-6",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-coral" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recorrido guiado
                </span>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Cerrar la guía"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {!active ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Te guío por los módulos clave de la demo ({total} pasos) y marco solo lo que ya
                  hiciste. Puedes cerrar y abrir la guía cuando quieras.
                </p>
                <Button onClick={handleStart} className="w-full bg-coral hover:bg-coral/90">
                  <Compass className="size-4 mr-2" aria-hidden="true" />
                  Iniciar recorrido
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Paso {index + 1} de {total}
                  </span>
                  {done ? (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="size-3" aria-hidden="true" />
                      Completado
                    </Badge>
                  ) : hasAction ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Se marca solo
                    </Badge>
                  ) : null}
                </div>

                <Progress
                  value={tourProgress(index)}
                  className="mt-2 h-1.5"
                  aria-label={`Progreso del recorrido: paso ${index + 1} de ${total}`}
                />

                <h2 className="mt-4 font-serif text-lg font-bold text-foreground">
                  {currentStep.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{currentStep.body}</p>

                {targetMissing && hasAction && (
                  <div role="status" className="mt-3 rounded-xl border border-coral/40 bg-coral/5 p-3">
                    <p className="text-xs text-muted-foreground">
                      Este paso no encuentra su elemento en pantalla: puede que se haya cerrado un
                      panel o que estés en otro módulo. Reábrelo o continúa al siguiente paso.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={isLast ? finish : next}
                    >
                      Ir al siguiente paso
                    </Button>
                  </div>
                )}

                {currentStep.id === "login" && !currentUser && !isAuthModalOpen && (
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      if (!isDesktop) setMobileOpen(false);
                    }}
                  >
                    <KeyRound className="size-4 mr-2" aria-hidden="true" />
                    Abrir acceso con PIN
                  </Button>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {(!hasAction || !isDesktop) && (
                    <Button
                      onClick={handleUnderstood}
                      variant={hidesOnly ? "outline" : "default"}
                      className={cn(
                        "w-full h-12 text-base",
                        !hidesOnly && "bg-coral hover:bg-coral/90",
                      )}
                    >
                      {hidesOnly ? "Ocultar guía" : isLast && !hasAction ? "Finalizar" : "Entendido"}
                    </Button>
                  )}
                  {hasAction && !isDesktop && (
                    <p className="text-xs text-muted-foreground">
                      Este paso avanza solo cuando hagas la acción señalada en pantalla.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {isDesktop && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={prev}
                        disabled={index === 0}
                        aria-label="Paso anterior"
                      >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="flex-1 text-muted-foreground"
                    >
                      Saltar recorrido
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RotateCcw className="size-3" aria-hidden="true" />
                    Reiniciar recorrido
                  </button>
                </div>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
