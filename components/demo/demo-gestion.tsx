"use client";

// Montaje del recorrido guiado dentro del POS (solo repo demo).
// Aquí además corre el auto-marcado por órdenes reales y por cambios del DOM.

import { DemoDomAutoMark, DemoOrdersAutoMark } from "./demo-auto-mark";
import { DemoTourProvider } from "./demo-tour-context";
import { DemoTourRuntime } from "./demo-runtime";

export function DemoGestion() {
  return (
    <DemoTourProvider>
      <DemoTourRuntime />
      <DemoOrdersAutoMark />
      <DemoDomAutoMark />
    </DemoTourProvider>
  );
}
