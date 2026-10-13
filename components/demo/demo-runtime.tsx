"use client";

// Runtime compartido del tour (auto-marcado, navegación, spotlight y widget).
// Solo repo demo.

import {
  DemoAuthAutoMark,
  DemoAutoAdvance,
  DemoAutoDismiss,
  DemoCartSync,
  DemoKanbanSync,
  DemoOverlaySync,
  DemoRouteAutoMark,
  DemoSidebarSync,
} from "./demo-auto-mark";
import { TourSpotlight } from "./tour-spotlight";
import { TourWidget } from "./tour-widget";

export function DemoTourRuntime() {
  return (
    <>
      <DemoAuthAutoMark />
      <DemoRouteAutoMark />
      <DemoAutoAdvance />
      <DemoSidebarSync />
      <DemoCartSync />
      <DemoKanbanSync />
      <DemoOverlaySync />
      <DemoAutoDismiss />
      <TourSpotlight />
      <TourWidget />
    </>
  );
}
