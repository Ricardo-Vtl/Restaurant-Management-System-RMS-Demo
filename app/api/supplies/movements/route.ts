import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { supplyMovementSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

const MOVEMENT_COLUMNS =
  "id, supply_id, type, quantity, stock_after, reason, created_at, supplies(name, unit), staff_users(name)" as const;

export async function GET(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:move"]);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const supplyId = searchParams.get("supply_id");
    const limitRaw = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50;

    let query = supabaseAdmin
      .from("supply_movements")
      .select(MOVEMENT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (supplyId) {
      query = query.eq("supply_id", supplyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:move"]);
  if (auth.error) return auth.error;

  try {
    const parsed = supplyMovementSchema.parse(await req.json());

    const { data, error } = await supabaseAdmin.rpc("add_supply_movement", {
      p_supply_id: parsed.supply_id,
      p_type: parsed.type,
      p_quantity: parsed.quantity,
      p_reason: parsed.reason,
      p_staff_id: auth.user.staffId,
    });

    if (error) {
      // Error de negocio del RPC (RAISE EXCEPTION → P0001): stock insuficiente, insumo inactivo
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
