import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { handleApiError } from "@/lib/api-error";
import { DEMO_MODE } from "@/lib/demo/config";

// GC de la demo. Protegido por CRON_SECRET (header Bearer o ?secret=).
// Sirve también como ping de actividad para evitar la pausa por inactividad.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Sin secreto solo se permite fuera de producción (dev local).
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization")?.replace("Bearer ", "");
  const query = new URL(req.url).searchParams.get("secret");
  return header === secret || query === secret;
}

export async function GET(req: Request) {
  if (!DEMO_MODE) {
    return NextResponse.json({ error: "Demo deshabilitada" }, { status: 404 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { error } = await supabaseAdmin.rpc("demo_gc");
    if (error) throw error;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    return handleApiError(err);
  }
}
