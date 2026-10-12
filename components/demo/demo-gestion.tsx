"use client";

// Montaje del recorrido guiado dentro del POS (solo repo demo).
// Aquí además corre el auto-marcado por órdenes reales (comanda/entrega/cobro).

import { DemoAuthAutoMark, DemoOrdersAutoMark } from "./demo-auto-mark";
import { DemoTourProvider } from "./demo-tour-context";
import { TourWidget } from "./tour-widget";
import { WelcomeDialog } from "./welcome-dialog";

export function DemoGestion() {
  return (
    <DemoTourProvider>
      <DemoAuthAutoMark />
      <DemoOrdersAutoMark />
      <WelcomeDialog />
      <TourWidget />
    </DemoTourProvider>
  );
}
