"use client";

// Spotlight del tour: atenúa la pantalla dejando un hueco EXACTO en el elemento
// objetivo (el hueco se posiciona con su getBoundingClientRect, así que no puede
// desalinearse) + estela accent alrededor. Nunca bloquea la interacción.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDemoTour } from "./demo-tour-context";
import { findTargetElement } from "./target-matcher";
import { isTargetMissing } from "./tour-steps";
import { useIsDesktop } from "./use-media-query";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const POLL_MS = 200;

// useLayoutEffect en cliente (mide antes del paint), useEffect en servidor (evita warning SSR).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export function TourSpotlight() {
  const { mounted, active, currentStep, session, reportTarget } = useDemoTour();
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [rect, setRect] = useState<Rect | null>(null);
  const scrolledRef = useRef(false);
  // Desde cuándo el objetivo del paso no aparece (null = presente) y último
  // estado reportado al contexto (para no re-renderizar en cada tick).
  const missingSinceRef = useRef<number | null>(null);
  const reportedRef = useRef<boolean | null>(null);

  // El target del paso ilumina el elemento a usar: el tour abre lo que haga
  // falta (drawer del sidebar, carrito, columna del kanban) para que esté visible.
  const target = active ? currentStep.target : undefined;
  const tableNumber = session?.tableNumber;

  useEffect(() => {
    scrolledRef.current = false;
    // El aviso de objetivo ausente se recalcula por paso (y el halo no debe
    // heredarse del paso anterior).
    missingSinceRef.current = null;
    reportedRef.current = null;
    setRect(null);
  }, [currentStep.id]);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    let stop = false;
    const vars = tableNumber ? { table: tableNumber } : {};

    const tick = () => {
      if (stop) return;
      const el = findTargetElement(target, { vars });

      // El panel avisa cuando el objetivo no aparece. Mientras la ausencia esté
      // dentro de la gracia se conserva el último halo: evita el parpadeo de las
      // mutaciones que cambian el texto del botón ("Procesando…", "Actualizando…").
      if (el) {
        missingSinceRef.current = null;
        const next = rectOf(el);
        setRect((prev) => (sameRect(prev, next) ? prev : next));
      } else if (missingSinceRef.current === null) {
        missingSinceRef.current = Date.now();
      } else if (isTargetMissing(missingSinceRef.current, Date.now())) {
        setRect(null);
      }

      const found = !isTargetMissing(missingSinceRef.current, Date.now());
      if (reportedRef.current !== found) {
        reportedRef.current = found;
        reportTarget(currentStep.id, found);
      }

      if (el && !scrolledRef.current) {
        scrolledRef.current = true;
        const r = el.getBoundingClientRect();
        const off =
          r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth;
        if (off) {
          el.scrollIntoView({
            block: "center",
            inline: "center",
            behavior: reduceMotion ? "auto" : "smooth",
          });
        }
      }

      window.setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      stop = true;
    };
  }, [target, reduceMotion, tableNumber, currentStep.id, reportTarget]);

  // Mide el label real (2 líneas en móvil) para decidir arriba/abajo y clampear.
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useIsomorphicLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    const update = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setLabelSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentStep.id, isDesktop, rect]);

  if (!mounted || !rect) return null;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const containerLeft = rect.left - PAD;
  const containerWidth = rect.width + PAD * 2;
  const containerHeight = rect.height + PAD * 2;

  const labelW = labelSize.width || Math.min(viewportW * 0.8, 280);
  const labelH = labelSize.height || (isDesktop ? 34 : 46);
  const gap = 12;

  // Elige el lado con hueco suficiente; si ninguno lo tiene (objetivo de alto
  // completo, p. ej. el sidebar), el label va dentro del hueco.
  const spaceBelow = viewportH - (rect.top + rect.height + PAD) - gap;
  const spaceAbove = rect.top - PAD - gap;
  const placeInside =
    currentStep.labelPlacement === "inside" ||
    (spaceBelow < labelH && spaceAbove < labelH && Math.max(spaceBelow, spaceAbove) < 16);

  let placeAbove = false;
  if (!placeInside) {
    if (spaceBelow >= labelH) placeAbove = false;
    else if (spaceAbove >= labelH) placeAbove = true;
    else placeAbove = spaceAbove > spaceBelow;
  }

  // Centrado sobre el objetivo, clampeado dentro del viewport.
  let labelLeft = (containerWidth - labelW) / 2;
  const absLeft = containerLeft + labelLeft;
  const maxLeft = viewportW - 8 - labelW;
  if (absLeft < 8) labelLeft = 8 - containerLeft;
  else if (absLeft > maxLeft) labelLeft = maxLeft - containerLeft;

  return (
    <div
      aria-hidden="true"
      data-demo-spotlight
      className="pointer-events-none fixed z-[60]"
      style={{
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: currentStep.radius ?? 14,
      }}
    >
      {/* Atenuación con hueco exacto */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: "inherit",
          boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.55)",
        }}
      />
      {/* Estela accent (el componente "emite" el aura) */}
      <motion.div
        className="absolute inset-0 border-2 border-coral"
        style={{
          borderRadius: "inherit",
          boxShadow: "0 0 28px 6px color-mix(in srgb, var(--coral) 45%, transparent)",
        }}
        animate={reduceMotion ? undefined : { opacity: [0.65, 1, 0.65] }}
        transition={reduceMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        ref={labelRef}
        // Un solo lenguaje visual para el label: tarjeta clara con borde coral,
        // legible sobre el atenuado y sobre el sidebar (donde va dentro del hueco).
        className="absolute rounded-xl border-2 border-coral bg-primary-foreground px-3 py-1.5 text-center text-navy shadow-lg"
        style={
          placeInside
            ? {
                maxWidth: Math.min(viewportW - 32, Math.max(containerWidth - 32, 220)),
                left: "50%",
                top: 12,
                transform: "translateX(-50%)",
              }
            : {
                maxWidth: Math.min(viewportW - 16, 280),
                left: labelLeft,
                ...(placeAbove
                  ? { bottom: containerHeight + gap }
                  : { top: containerHeight + gap }),
              }
        }
      >
        {/* En móvil el panel suele estar cerrado: el label lleva el título del paso. */}
        {!isDesktop && (
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-coral">
            {currentStep.title}
          </span>
        )}
        <span className={cn("block text-xs font-medium", !isDesktop && "mt-0.5")}>
          {isDesktop
            ? currentStep.label ?? "Haz clic aquí"
            : currentStep.mobileLabel ?? currentStep.label ?? "Sigue la guía"}
        </span>
      </div>
    </div>
  );
}
