import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn(async () => {}) }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  },
}));

vi.mock("@/lib/stores/auth-store", () => ({
  useAuthStore: {
    getState: () => ({ logout: logoutMock }),
  },
}));

import { apiFetch } from "@/lib/api-fetch";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    logoutMock.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("POST con 5xx NO reintenta (evita duplicados)", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ error: "x" }, 500));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(apiFetch("/api/orders", { method: "POST", body: "{}" })).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("GET con 5xx reintenta hasta 2 veces", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(async () => jsonResponse({ error: "x" }, 500));
    vi.stubGlobal("fetch", fetchSpy);

    const promise = apiFetch("/api/orders").catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await promise;
    expect((err as Error).message).toBe("x");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("4xx no reintenta", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ error: "no" }, 400));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(apiFetch("/api/orders")).rejects.toThrow("no");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("error como objeto (flatten) produce mensaje legible, no [object Object]", async () => {
    vi.stubGlobal("fetch", async () =>
      jsonResponse({ error: { formErrors: ["Campo requerido"], fieldErrors: {} } }, 400),
    );

    await expect(apiFetch("/api/checkout", { method: "POST", body: "{}" })).rejects.toThrow(
      "Campo requerido",
    );
  });

  it("rechaza URLs fuera de /api/", async () => {
    await expect(apiFetch("https://evil.com/api/orders")).rejects.toThrow("URL inválida");
  });

  it("401 fuerza logout (staff desactivado / token inválido)", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({ error: "No autorizado: solo personal activo" }, 401));

    await expect(apiFetch("/api/orders")).rejects.toThrow("solo personal activo");
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("403 NO fuerza logout (permisos insuficientes de rol)", async () => {
    logoutMock.mockClear();
    vi.stubGlobal("fetch", async () => jsonResponse({ error: "No autorizado: permisos insuficientes" }, 403));

    await expect(apiFetch("/api/orders", { method: "POST", body: "{}" })).rejects.toThrow("permisos insuficientes");
    expect(logoutMock).not.toHaveBeenCalled();
  });
});
