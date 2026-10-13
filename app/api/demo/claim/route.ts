import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { handleApiError } from "@/lib/api-error";
import { DEMO_MODE } from "@/lib/demo/config";
import { readSessionId } from "@/lib/demo/session";

// Reclama una mesa libre exclusiva para la sesión (claim atómico, vía RPC).
export async function POST() {
  if (!DEMO_MODE) {
    return NextResponse.json({ error: "Demo deshabilitada" }, { status: 404 });
  }

  const sid = await readSessionId();
  if (!sid) {
    return NextResponse.json({ error: "Sesión no inicializada" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("demo_claim_table", { p_session: sid });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      tableId: row?.table_id ?? null,
      tableNumber: row?.table_number ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
