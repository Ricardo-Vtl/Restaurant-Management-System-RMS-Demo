"use client";

import { useEffect } from "react";
import { useSiteConfig } from "@/hooks/use-site-config";

// Aplica los colores de marca del módulo Config sobre las CSS vars del tema
// (navy/primary = color principal, coral/accent = color de acento).
export function BrandTheme() {
  const { data } = useSiteConfig();

  useEffect(() => {
    const colors = data?.brand_colors;
    if (!colors) return;
    const root = document.documentElement;
    root.style.setProperty("--navy", colors.primary);
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--coral", colors.accent);
    root.style.setProperty("--accent", colors.accent);
  }, [data?.brand_colors]);

  return null;
}
