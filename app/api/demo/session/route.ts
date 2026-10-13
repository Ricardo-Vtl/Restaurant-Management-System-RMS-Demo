import { NextResponse } from "next/server";
import { DEMO_MODE, DEMO_SESSION_COOKIE } from "@/lib/demo/config";
import {
  SESSION_COOKIE_OPTIONS,
  newSessionId,
  readSessionId,
  serializeSession,
} from "@/lib/demo/session";

// Establece (o rota) la cookie de sesión de demo. No requiere auth de staff.
export async function POST() {
  if (!DEMO_MODE) {
    return NextResponse.json({ error: "Demo deshabilitada" }, { status: 404 });
  }

  const existing = await readSessionId();
  const sid = existing ?? newSessionId();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_SESSION_COOKIE, serializeSession(sid), SESSION_COOKIE_OPTIONS);
  return res;
}
