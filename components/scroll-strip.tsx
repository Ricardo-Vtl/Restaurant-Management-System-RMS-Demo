"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollStripProps {
  children: React.ReactNode;
  /** Etiqueta accesible del grupo; también nombra las flechas. */
  ariaLabel: string;
  /** Clases del scroller horizontal (p. ej. `flex gap-2`). */
  className?: string;
}

/**
 * Riel horizontal con flechas `< >`. Las flechas viven fuera del scroller (no
 * tapan chips) y solo aparecen cuando hay contenido fuera de vista en esa
 * dirección, de modo que los rieles de categorías son explorables con ratón.
 */
export function ScrollStrip({ children, ariaLabel, className }: ScrollStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // El contenido puede cambiar de ancho sin redimensionar el scroller.
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * el.clientWidth * 0.8,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const arrowClass =
    "size-11 sm:size-9 shrink-0 rounded-full bg-navy text-white shadow-md grid place-items-center transition-colors hover:bg-navy/90";

  return (
    <div className="flex items-center gap-1">
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label={`${ariaLabel}: desplazar a la izquierda`}
          className={arrowClass}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      )}
      <div
        ref={scrollerRef}
        onScroll={update}
        role="group"
        aria-label={ariaLabel}
        className={cn("flex-1 min-w-0 overflow-x-auto scrollbar-hide", className)}
      >
        {children}
      </div>
      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label={`${ariaLabel}: desplazar a la derecha`}
          className={arrowClass}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
