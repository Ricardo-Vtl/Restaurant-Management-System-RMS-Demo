"use client";

// Pista del acceso secreto (triple clic en el logo): toast único por visitante.
// El resaltado visual del elemento lo hace el spotlight del tour (hueco exacto).

import { useEffect } from "react";
import { MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useDemoTour } from "./demo-tour-context";

export function LoginHint() {
  const { mounted, active, state, currentStep, markHintShown } = useDemoTour();
  const { currentUser } = useAuth();

  const eligible =
    mounted &&
    state.welcomeSeen &&
    !currentUser &&
    !state.completed.includes("acceso") &&
    !state.hintShown &&
    (active ? currentStep.id === "acceso" : true);

  useEffect(() => {
    if (!eligible) return;
    const delay = active ? 600 : 8000;
    const timer = setTimeout(() => {
      markHintShown();
      toast("El acceso del staff es secreto", {
        description: "Haz triple clic en el logo de arriba para abrir el teclado de PIN.",
        icon: <MousePointerClick className="size-4" aria-hidden="true" />,
        duration: 9000,
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [eligible, active, markHintShown]);

  return null;
}
