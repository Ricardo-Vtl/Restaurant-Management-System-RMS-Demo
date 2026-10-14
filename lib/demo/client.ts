// Cliente de la sesión de demo (navegador). Las rutas /api/demo/* no requieren
// auth de staff: se autentican con la cookie de sesión firmada (misma origin).

export interface DemoSession {
  sessionId: string;
  tableId: string;
  tableNumber: string;
}

/** Establece (o refresca) la cookie de sesión de demo. */
export async function ensureDemoSession(): Promise<void> {
  try {
    await fetch("/api/demo/session", { method: "POST", credentials: "same-origin" });
  } catch {
    // best-effort
  }
}

/** Reclama una mesa libre exclusiva para esta sesión. */
export async function claimDemoTable(): Promise<DemoSession | null> {
  try {
    const res = await fetch("/api/demo/claim", { method: "POST", credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      sessionId?: string | null;
      tableId?: string | null;
      tableNumber?: string | null;
    };
    if (!data.sessionId || !data.tableId || !data.tableNumber) return null;
    return { sessionId: data.sessionId, tableId: data.tableId, tableNumber: data.tableNumber };
  } catch {
    return null;
  }
}

/** Libera la mesa de la sesión (mejor esfuerzo). */
export async function releaseDemoTable(): Promise<void> {
  try {
    await fetch("/api/demo/release", { method: "POST", credentials: "same-origin" });
  } catch {
    // best-effort
  }
}
