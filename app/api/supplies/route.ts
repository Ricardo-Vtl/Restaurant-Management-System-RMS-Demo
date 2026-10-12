import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { supplyCreateSchema, supplyUpdateSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

const SUPPLY_COLUMNS = "id, name, unit, stock_current, stock_min, is_active, created_at, updated_at" as const;

export async function GET(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:move"]);
  if (auth.error) return auth.error;

  try {
    const { data, error } = await supabaseAdmin
      .from("supplies")
      .select(SUPPLY_COLUMNS)
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:manage"]);
  if (auth.error) return auth.error;

  try {
    const parsed = supplyCreateSchema.parse(await req.json());
    const { data, error } = await supabaseAdmin
      .from("supplies")
      .insert({ name: parsed.name, unit: parsed.unit, stock_min: parsed.stock_min })
      .select(SUPPLY_COLUMNS)
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:manage"]);
  if (auth.error) return auth.error;

  try {
    const parsed = supplyUpdateSchema.parse(await req.json());
    const { data, error } = await supabaseAdmin
      .from("supplies")
      .update({ ...parsed.updates, updated_at: new Date().toISOString() })
      .eq("id", parsed.id)
      .select(SUPPLY_COLUMNS);

    if (error) throw error;
    if (!data?.length) {
      return NextResponse.json({ error: "Insumo no encontrado" }, { status: 404 });
    }
    return NextResponse.json(data[0]);
  } catch (err) {
    return handleApiError(err);
  }
}
