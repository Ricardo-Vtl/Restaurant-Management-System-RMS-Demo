"use client";

// Montaje del recorrido guiado en la landing pública (solo repo demo).

import { DemoAuthAutoMark } from "./demo-auto-mark";
import { DemoTourProvider } from "./demo-tour-context";
import { LoginHint } from "./login-hint";
import { TourWidget } from "./tour-widget";
import { WelcomeDialog } from "./welcome-dialog";

export function DemoLanding() {
  return (
    <DemoTourProvider>
      <DemoAuthAutoMark />
      <WelcomeDialog />
      <TourWidget />
      <LoginHint />
    </DemoTourProvider>
  );
}
