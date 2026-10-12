"use client";

// Widget flotante del recorrido guiado: botón "Guía" + panel de pasos.
// No es modal: el visitante sigue pudiendo usar la app mientras la guía está abierta.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Compass, KeyRound, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useDemoTour } from "./demo-tour-context";
import { TOUR_STEPS, clampStep, tourProgress } from "./tour-steps";

const PANEL_ID = "demo-tour-panel";

// ¿Hay un diálogo/sheet abierto? En móvil el botón flotante taparía el teclado
// del PIN (o el CTA del carrito), así que se oculta mientras haya uno abierto.
function useDialogOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => setOpen(!!document.querySelector('[role="dialog"]'));
    check();
    const id = window.setInterval(check, 300);
    return () => window.clearInterval(id);
  }, []);
  return open;
}

export function TourWidget() {
  const { mounted, state, active, currentStep, start, finish, reset, next, prev, setPanelOpen } =
    useDemoTour();
  const { currentUser, setIsAuthModalOpen } = useAuth();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const dialogOpen = useDialogOpen();

  const open = mounted && state.panelOpen;
  const total = TOUR_STEPS.length;
  const index = clampStep(state.step);
  const done = state.completed.includes(currentStep.id);
  const isLast = index === total - 1;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setPanelOpen]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      {!dialogOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(!state.panelOpen)}
          aria-expanded={state.panelOpen}
          aria-controls={PANEL_ID}
          aria-label={state.panelOpen ? "Cerrar la guía de la demo" : "Abrir la guía de la demo"}
          className={cn(
            "fixed bottom-6 left-6 md:left-auto md:right-6 z-[70] size-14 rounded-full bg-coral text-accent-foreground shadow-2xl shadow-coral/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral",
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
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "fixed z-[70] border border-coral/30 bg-card shadow-2xl focus-visible:outline-none",
              dialogOpen
                ? "top-2 left-3 right-3 flex items-center gap-2 rounded-full px-3 py-1.5"
                : "top-16 bottom-auto left-4 right-4 max-h-[45dvh] overflow-y-auto rounded-2xl p-5 md:top-auto md:bottom-24 md:left-auto md:right-6 md:w-96 md:max-h-[calc(100dvh-8rem)]",
            )}
          >
            {dialogOpen && active ? (
              <>
                <Compass className="size-4 shrink-0 text-coral" aria-hidden="true" />
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {index + 1}/{total}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {currentStep.title}
                </span>
                <Button
                  size="sm"
                  onClick={isLast ? finish : next}
                  className="h-8 shrink-0 bg-coral hover:bg-coral/90"
                >
                  {isLast ? "Fin" : "Siguiente"}
                </Button>
              </>
            ) : (
              <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-coral" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recorrido guiado
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
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
                <Button onClick={start} className="w-full bg-coral hover:bg-coral/90">
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
                  ) : currentStep.auto || currentStep.completeWhen || currentStep.completeWhenGone || currentStep.completeOnRoute ? (
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

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prev}
                    disabled={index === 0}
                    aria-label="Paso anterior"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    onClick={isLast ? finish : next}
                    className="flex-1 bg-coral hover:bg-coral/90"
                  >
                    {isLast ? "Finalizar" : "Siguiente"}
                    {!isLast && <ChevronRight className="size-4 ml-2" aria-hidden="true" />}
                  </Button>
                </div>

                {currentStep.id === "login" && !currentUser && (
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <KeyRound className="size-4 mr-2" aria-hidden="true" />
                    Abrir acceso con PIN
                  </Button>
                )}

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
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
