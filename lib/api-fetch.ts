import { supabase } from "./supabase";
import { useAuthStore } from "./stores/auth-store";

// ponytail: only idempotent methods retry — a 5xx-after-commit on POST would duplicate inserts
const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);

async function fetchWithRetry(url: string, init: RequestInit, retries: number): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || attempt === retries) return res;
    if (res.status < 500 || !RETRYABLE_METHODS.has(method)) return res;
    await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
  }
  throw new Error("Max retries exceeded");
}

function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const error = (body as Record<string, unknown>).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const flatten = error as { formErrors?: unknown; message?: unknown };
    if (typeof flatten.message === "string") return flatten.message;
    if (Array.isArray(flatten.formErrors) && flatten.formErrors.length > 0) {
      return flatten.formErrors.filter((m): m is string => typeof m === "string").join(", ");
    }
    return "Datos inválidos";
  }
  return undefined;
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!url.startsWith("/api/")) {
    throw new Error(`URL inválida: solo rutas /api/ permitidas`);
  }

  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  // FormData lleva su propio boundary (multipart) — no forzar JSON
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetchWithRetry(url, { ...init, headers }, 2);

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Error desconocido" }));
    if (res.status === 401) {
      // Token inválido o staff desactivado: forzar logout para no dejar la
      // sesión viva refetcheando en loop (el layout vuelve al gate PIN).
      void useAuthStore.getState().logout().catch(() => {});
    }
    throw new Error(extractErrorMessage(body) || `Error ${res.status}`);
  }

  return res;
}
