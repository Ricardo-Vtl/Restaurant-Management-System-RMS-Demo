"use client";

// Montaje del recorrido guiado en la landing pública (solo repo demo).

import { DemoTourProvider } from "./demo-tour-context";
import { DemoTourRuntime } from "./demo-runtime";
import { WelcomeDialog } from "./welcome-dialog";

export function DemoLanding() {
  return (
    <DemoTourProvider>
      <DemoTourRuntime />
      <WelcomeDialog />
    </DemoTourProvider>
  );
}
