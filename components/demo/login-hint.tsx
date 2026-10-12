"use client";

// Pista del acceso secreto (triple clic en el logo): toast + halo animado.
// Se muestra una sola vez por visitante. Decorativa para lectores de pantalla:
// el mensaje accesible viaja en el toast.

import { useEffect, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useDemoTour } from "./demo-tour-context";

interface LogoRect {
  top: number;
  left: number;
  size: number;
}

export function LoginHint() {
  const { mounted, active, state, currentStep, markHintShown } = useDemoTour();
  const { currentUser } = useAuth();
  const [rect, setRect] = useState<LogoRect | null>(null);
  const [visible, setVisible] = useState(false);

  const eligible =
    mounted &&
    state.welcomeSeen &&
    !currentUser &&
    !state.completed.includes("acceso") &&
    !state.hintShown &&
    (active ? currentStep.id === "acceso" : true);

  // Dispara la pista una sola vez: al llegar al paso, o diferida en exploración libre.
  useEffect(() => {
    if (!eligible) return;
    const delay = active ? 600 : 8000;
    const showTimer = setTimeout(() => {
      markHintShown();
      setVisible(true);
      toast("El acceso del staff es secreto", {
        description: "Haz triple clic en el logo de arriba para abrir el teclado de PIN.",
        icon: <MousePointerClick className="size-4" aria-hidden="true" />,
        duration: 9000,
      });
    }, delay);
    return () => clearTimeout(showTimer);
  }, [eligible, active, markHintShown]);

  // El halo se apaga solo para no estorbar.
  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(hideTimer);
  }, [visible]);

  // Posición del logo (el header es fijo: solo cambia al redimensionar).
  useEffect(() => {
    if (!visible) return;
    const el = document.querySelector("[data-demo-logo]");
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, size: Math.max(r.width, r.height) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [visible]);

  if (!visible || !rect) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-40"
      style={{ top: rect.top - 6, left: rect.left - 6 }}
    >
      <div className="relative">
        <div
          className="animate-pulse-coral rounded-full ring-2 ring-coral"
          style={{ width: rect.size + 12, height: rect.size + 12 }}
        />
        <div className="absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg">
          Triple clic aquí
        </div>
      </div>
    </div>
  );
}
