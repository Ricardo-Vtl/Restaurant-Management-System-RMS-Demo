"use client";

// Runtime compartido del tour (auto-marcado, navegación, spotlight y widget).
// Solo repo demo.

import {
  DemoAuthAutoMark,
  DemoAutoAdvance,
  DemoCartSync,
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
      <TourSpotlight />
      <TourWidget />
    </>
  );
}
