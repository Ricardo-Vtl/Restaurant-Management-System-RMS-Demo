import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireRole } from "@/lib/api-guard";
import { tableSchema, tableUpdateSchema, tableDeleteSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";
import { naturalSort } from "@/lib/natural-sort";
import type { Database } from "@/lib/database.types";

type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];

type TableRow = Database["public"]["Tables"]["tables"]["Row"];

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.has("id")) {
      const { data, error } = await supabaseAdmin
        .from("tables")
        .select("id, number, capacity, base_seats, status, section, current_guests, currentOrderId, isJoined, joinedTableIds, is_active, totalCuenta, originalConfig, position, created_at")
        .eq("id", searchParams.get("id")!)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json(data);
    }

    let query = supabaseAdmin.from("tables").select("id, number, capacity, base_seats, status, section, current_guests, currentOrderId, isJoined, joinedTableIds, is_active, totalCuenta, originalConfig, position, created_at").order("number", { ascending: true });

    if (searchParams.has("status")) {
      const statusParam = searchParams.get("status")! as Database["public"]["Enums"]["table_status"];
      query = query.eq("status", statusParam);
    }
    if (searchParams.has("is_active")) query = query.eq("is_active", searchParams.get("is_active") === "true");
    if (searchParams.has("section")) {
      const sectionParam = searchParams.get("section");
      if (sectionParam) query = query.eq("section", sectionParam);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json((data ?? []).sort(naturalSort));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["tables:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    const items = Array.isArray(body)
      ? body.map((item: unknown) => tableSchema.parse(item))
      : [tableSchema.parse(body)];

    const { data, error } = Array.isArray(body)
      ? await supabaseAdmin.from("tables").insert(items as TableInsert[]).select()
      : await supabaseAdmin.from("tables").insert(items as TableInsert[]).select().single();

    if (error) {
      return NextResponse.json({ error: "Error al crear mesa(s)" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

// V9-SEC-05: campos estructurales (configuración de sala) → solo admin.
// Operativos (status/current_guests/totalCuenta...) → cualquier staff.
const STRUCTURAL_TABLE_FIELDS = new Set([
  "number",
  "capacity",
  "base_seats",
  "is_active",
  "isJoined",
  "joinedTableIds",
  "originalConfig",
]);

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = tableUpdateSchema.parse(body);

    const touchesStructural = Object.keys(parsed.updates).some((key) => STRUCTURAL_TABLE_FIELDS.has(key));
    const auth = touchesStructural
      ? await requireRole(req, ...ABILITIES["tables:manage"])
      : await requireAuth(req);
    if (auth.error) return auth.error;

    let query = supabaseAdmin.from("tables").update(parsed.updates);
    for (const [key, value] of Object.entries(parsed.filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: "Error al actualizar mesa" }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["tables:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = tableDeleteSchema.parse(body);

    let query = supabaseAdmin.from("tables").update({ is_active: false });
    if (parsed.ids) {
      query = query.in("id", parsed.ids);
    } else if (parsed.eq?.id) {
      query = query.eq("id", parsed.eq.id);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: "Error al desactivar mesa(s)" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
