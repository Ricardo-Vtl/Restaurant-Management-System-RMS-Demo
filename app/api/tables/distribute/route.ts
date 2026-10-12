import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { distributeSchema } from "@/lib/api-schemas";
import { ABILITIES } from "@/lib/abilities";

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["tables:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = distributeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.errors.map((e) => ({ message: e.message })) }, { status: 400 });
    }

    const { error } = await supabaseAdmin.rpc("update_table_distribution", {
      p_table_id: parsed.data.tableId,
      p_capacity: parsed.data.capacity,
      p_current_guests: parsed.data.currentGuests,
      p_section: parsed.data.section,
      p_cascade_ids: parsed.data.cascadeIds,
      p_cascade_capacities: parsed.data.cascadeCapacities,
      p_cascade_is_active: parsed.data.cascadeIsActive,
      p_config_id: parsed.data.configId as string,
      p_sillas_respaldo: parsed.data.sillasRespaldo,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
