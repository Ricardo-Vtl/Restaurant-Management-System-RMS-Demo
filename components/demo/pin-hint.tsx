"use client";

// Credenciales de la demo visibles dentro del modal de acceso (solo repo demo).

import { KeyRound } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { DEMO_PINS } from "@/lib/demo/pins";

export function DemoPinHint() {
  return (
    <div className="mt-6 rounded-xl border border-coral/30 bg-coral/5 p-3 text-center">
      <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground">
        <KeyRound className="size-3.5 text-coral" aria-hidden="true" />
        Demo — usa cualquier PIN de prueba
      </p>
      <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {DEMO_PINS.map(({ role, pin }) => (
          <span key={role} className="inline-flex items-center gap-1">
            {role} <Kbd>{pin}</Kbd>
          </span>
        ))}
      </p>
    </div>
  );
}
