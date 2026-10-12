// Password de Supabase Auth desacoplado del PIN operativo (V9-SEC-03).
// Derivado determinista HMAC-SHA256: el servidor puede reconstruirlo al login
// sin almacenarlo; el PIN jamás toca Supabase Auth. 64 hex chars: no brute-forceable.
import { createHmac } from "node:crypto";

export function deriveAuthPassword(authId: string): string {
  const secret = process.env.AUTH_PASSWORD_SECRET;
  if (!secret) {
    throw new Error("AUTH_PASSWORD_SECRET no configurado");
  }
  return createHmac("sha256", secret).update(authId).digest("hex");
}
