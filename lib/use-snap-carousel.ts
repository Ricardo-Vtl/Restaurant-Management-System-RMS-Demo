import { useCallback, useRef, useState } from "react";

/**
 * Carrusel con scroll-snap: expone el ref del scroller, el índice activo y
 * helpers para saltar a un panel. Usado por el kanban (pedidos) y los paneles
 * de cocina (KDS). La sincronización con el snap se hace midiendo qué hijo
 * está pegado al borde izquierdo del scroller.
 */
export function useSnapCarousel(count: number) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const elLeft = el.getBoundingClientRect().left;
    let idx = 0;
    let min = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const d = Math.abs(child.getBoundingClientRect().left - elLeft);
      if (d < min) {
        min = d;
        idx = i;
      }
    });
    setActive(idx);
  }, []);

  const goTo = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(count - 1, i));
      const child = el.children[clamped] as HTMLElement | undefined;
      if (!child) return;
      const target =
        child.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
      el.scrollTo({ left: target, behavior });
    },
    [count],
  );

  return { scrollerRef, active, setActive, handleScroll, goTo };
}
