import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { recipeSetSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

const RECIPE_COLUMNS = "id, product_id, size_id, supply_id, quantity, supplies(name, unit)" as const;

export async function GET(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:move"]);
  if (auth.error) return auth.error;

  try {
    // La tabla es pequeña (una fila por insumo/talla de cada receta): el cliente
    // agrupa por producto — sin filtro server-side.
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select(RECIPE_COLUMNS)
      .order("product_id", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["inventory:manage"]);
  if (auth.error) return auth.error;

  try {
    const parsed = recipeSetSchema.parse(await req.json());

    const { error } = await supabaseAdmin.rpc("set_product_recipe", {
      p_product_id: parsed.product_id,
      p_lines: parsed.lines,
    });

    if (error) {
      if (error.code === "P0001") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ product_id: parsed.product_id });
  } catch (err) {
    return handleApiError(err);
  }
}
