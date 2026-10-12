import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getClientIp } from "@/lib/ip";
import { deriveAuthPassword } from "@/lib/auth-password";
import { loginSchema } from "@/lib/api-schemas";

function headers(entries: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(entries)) h.set(k, v);
  return h;
}

describe("getClientIp", () => {
  it("prefiere x-vercel-forwarded-for", () => {
    expect(
      getClientIp(headers({ "x-vercel-forwarded-for": "1.2.3.4", "x-forwarded-for": "1.2.3.4" })),
    ).toBe("1.2.3.4");
  });

  it("toma el ÚLTIMO valor de x-forwarded-for (IP real apendada por Vercel)", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1, 1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("prefijo spoofeado no cambia la clave", () => {
    const legit = getClientIp(headers({ "x-forwarded-for": "1.2.3.4" }));
    const spoofed = getClientIp(headers({ "x-forwarded-for": "999.999.999.999, 1.2.3.4" }));
    expect(spoofed).toBe(legit);
  });

  it("fallback localhost sin headers", () => {
    expect(getClientIp(headers({}))).toBe("127.0.0.1");
  });
});

describe("deriveAuthPassword", () => {
  const OLD_SECRET = process.env.AUTH_PASSWORD_SECRET;

  beforeEach(() => {
    process.env.AUTH_PASSWORD_SECRET = "test-secret";
  });
  afterEach(() => {
    if (OLD_SECRET === undefined) delete process.env.AUTH_PASSWORD_SECRET;
    else process.env.AUTH_PASSWORD_SECRET = OLD_SECRET;
  });

  it("es determinista para el mismo auth_id", () => {
    const a = deriveAuthPassword("11111111-1111-1111-1111-111111111111");
    const b = deriveAuthPassword("11111111-1111-1111-1111-111111111111");
    expect(a).toBe(b);
  });

  it("difiere por auth_id y nunca es el PIN", () => {
    const a = deriveAuthPassword("11111111-1111-1111-1111-111111111111");
    const b = deriveAuthPassword("22222222-2222-2222-2222-222222222222");
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/^\d{6}$/);
    expect(a).toHaveLength(64);
  });

  it("lanza sin AUTH_PASSWORD_SECRET", () => {
    delete process.env.AUTH_PASSWORD_SECRET;
    expect(() => deriveAuthPassword("any")).toThrow("AUTH_PASSWORD_SECRET");
  });
});

describe("loginSchema (V9-SEC-03)", () => {
  it("acepta un PIN de 6 dígitos", () => {
    expect(loginSchema.parse({ pin: "123456" })).toEqual({ pin: "123456" });
  });

  it("rechaza PIN de 4 dígitos (espacio de 10^4)", () => {
    expect(loginSchema.safeParse({ pin: "1234" }).success).toBe(false);
  });

  it("rechaza no numéricos y longitudes intermedias", () => {
    expect(loginSchema.safeParse({ pin: "12ab56" }).success).toBe(false);
    expect(loginSchema.safeParse({ pin: "12345" }).success).toBe(false);
  });
});
