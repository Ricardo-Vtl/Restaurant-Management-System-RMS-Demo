import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { supplyCountSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:manage"]);
  if (auth.error) return auth.error;

  try {
    const parsed = supplyCountSchema.parse(await req.json());

    const { data, error } = await supabaseAdmin.rpc("set_supply_stock", {
      p_supply_id: parsed.supply_id,
      p_counted: parsed.counted,
      p_reason: parsed.reason,
      p_staff_id: auth.user.staffId,
    });

    if (error) {
      if (error.code === "P0001") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ stock_after: data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
