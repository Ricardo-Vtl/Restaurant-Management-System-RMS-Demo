"use client";

// Spotlight del tour: atenúa la pantalla dejando un hueco EXACTO en el elemento
// objetivo (el hueco se posiciona con su getBoundingClientRect, así que no puede
// desalinearse) + estela accent alrededor. Nunca bloquea la interacción.

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDemoTour } from "./demo-tour-context";
import { findTargetElement } from "./target-matcher";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const POLL_MS = 300;

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
  const [rect, setRect] = useState<Rect | null>(null);
  const scrolledRef = useRef(false);

  const target = active ? currentStep.target : undefined;

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

  if (!mounted || !rect) return null;

  const labelAbove = rect.top > 96;
  const labelLeft = rect.left < 96;

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
        className={cn(
          "absolute whitespace-nowrap rounded-full bg-navy px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg",
          labelAbove ? "-top-10" : "-bottom-10",
          labelLeft ? "left-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {currentStep.label ?? "Haz clic aquí"}
      </div>
    </div>
  );
}
