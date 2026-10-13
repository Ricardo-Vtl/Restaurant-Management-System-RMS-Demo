// Sesión de demo firmada en cookie httpOnly (solo servidor). El cliente nunca
// ve el id, así que no puede forjar ni liberar la mesa de otra sesión.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, DEMO_SESSION_MAX_AGE_S } from "./config";

// Secreto de firma: dedicado, con fallback al de auth (existe en la demo) y,
// si no hay ninguno, uno aleatorio por arranque (invalida sesiones al reiniciar).
const SECRET =
  process.env.DEMO_SESSION_SECRET || process.env.AUTH_PASSWORD_SECRET || randomUUID();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(sid: string): string {
  return createHmac("sha256", SECRET).update(sid).digest("base64url");
}

export function serializeSession(sid: string): string {
  return `${sid}.${sign(sid)}`;
}

/** Verifica firma + formato y devuelve el id, o null si la cookie es inválida. */
export function parseSession(value: string | null | undefined): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const sid = value.slice(0, idx);
  const provided = value.slice(idx + 1);
  if (!UUID_RE.test(sid)) return null;
  const expected = sign(sid);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sid;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DEMO_SESSION_MAX_AGE_S,
};

export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return parseSession(store.get(DEMO_SESSION_COOKIE)?.value);
}

export function newSessionId(): string {
  return randomUUID();
}
