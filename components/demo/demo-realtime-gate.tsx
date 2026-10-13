"use client";

// En modo demo se desactiva el realtime: evita que la actividad de otra sesión
// refresque la UI de un visitante (eco/ruido cruzado) y reduce superficie.

import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { DEMO_MODE } from "@/lib/demo/config";

function RealtimeSubscriber() {
  useRealtimeSubscription();
  return null;
}

export function DemoRealtimeGate() {
  if (DEMO_MODE) return null;
  return <RealtimeSubscriber />;
}
