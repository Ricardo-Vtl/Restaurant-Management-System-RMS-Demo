import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { productSchema, productUpdateSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["products:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = productSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert(parsed)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Error al crear el producto" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["products:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = productUpdateSchema.parse(body);

    let query = supabaseAdmin.from("products").update(parsed.updates);
    for (const [key, value] of Object.entries(parsed.filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Error al actualizar el producto" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
