"use client";

// Spotlight del tour: atenúa la pantalla dejando un hueco EXACTO en el elemento
// objetivo (el hueco se posiciona con su getBoundingClientRect, así que no puede
// desalinearse) + estela accent alrededor. Nunca bloquea la interacción.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDemoTour } from "./demo-tour-context";
import { findTargetElement } from "./target-matcher";
import { useIsDesktop } from "./use-media-query";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const POLL_MS = 300;

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
  const { mounted, active, currentStep } = useDemoTour();
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [rect, setRect] = useState<Rect | null>(null);
  const scrolledRef = useRef(false);

  // En móvil los pasos cuyo target vive en el sidebar usan ese selector (el tour
  // abre el drawer); el resto usa el mobileTarget (encabezado de la página).
  const useSidebarTarget = !isDesktop && !!currentStep.needsSidebar;
  const target = active
    ? isDesktop || useSidebarTarget
      ? currentStep.target
      : currentStep.mobileTarget ?? currentStep.target
    : undefined;

  useEffect(() => {
    scrolledRef.current = false;
  }, [currentStep.id]);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    let stop = false;

    const tick = () => {
      if (stop) return;
      const el = findTargetElement(target);
      const next = el ? rectOf(el) : null;
      setRect((prev) => (sameRect(prev, next) ? prev : next));

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
  }, [target, reduceMotion]);

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
  const labelH = labelSize.height || (isDesktop ? 30 : 46);
  const gap = isDesktop ? 12 : 32;

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
        className={cn(
          "absolute px-3 py-1.5 text-center shadow-lg",
          isDesktop ? "rounded-full text-xs font-medium" : "rounded-xl",
          placeInside ? "bg-primary-foreground text-navy" : "bg-navy text-primary-foreground",
        )}
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
        {isDesktop ? (
          currentStep.label ?? "Haz clic aquí"
        ) : (
          <>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-coral">
              {currentStep.title}
            </span>
            <span className="mt-0.5 block text-xs font-medium">
              {currentStep.mobileLabel ?? currentStep.label ?? "Sigue la guía"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
