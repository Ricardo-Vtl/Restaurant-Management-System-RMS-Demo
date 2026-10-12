"use client";

// Hook mínimo de media query para el tour (móvil vs desktop). Sin dependencias.

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  // Inicializa sincrónicamente en el cliente (evita una carrera de un frame en
  // efectos que dependen del ancho). En SSR devuelve false; los componentes del
  // tour solo renderizan tras montar, así que no hay mismatch de hidratación.
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Alineado con el breakpoint del sidebar del POS (`lg` = 1024px): por debajo, el
// sidebar es un drawer oculto y el tour debe comportarse como móvil.
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
