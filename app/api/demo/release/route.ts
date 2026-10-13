import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { handleApiError } from "@/lib/api-error";
import { DEMO_MODE } from "@/lib/demo/config";
import { readSessionId } from "@/lib/demo/session";

// Libera la mesa de la sesión (cancela lo pendiente y la deja libre).
export async function POST() {
  if (!DEMO_MODE) {
    return NextResponse.json({ error: "Demo deshabilitada" }, { status: 404 });
  }

  const sid = await readSessionId();
  if (sid) {
    try {
      const { error } = await supabaseAdmin.rpc("demo_release_table", { p_session: sid });
      if (error) throw error;
    } catch (err) {
      return handleApiError(err);
    }
  }

  return NextResponse.json({ ok: true });
}
