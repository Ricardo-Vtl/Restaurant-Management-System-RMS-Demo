import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireRole } from "@/lib/api-guard";
import { configSchema, configUpdateSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

const CONFIG_COLUMNS =
  "id, sillas_respaldo, total_mesas, total_sillas, name, slogan, logo_url, hero_slides, brand_colors, phone, whatsapp_number, address, maps_embed_url, socials, timezone, schedule, closed_until, web_orders_enabled, channels, tax_enabled, tax_rate, tax_label, rfc, razon_social, ticket_footer, ops, created_at, updated_at";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.has("id")) {
      const { data, error } = await supabaseAdmin
        .from("restaurant_config")
        .select(CONFIG_COLUMNS)
        .eq("id", searchParams.get("id")!)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await supabaseAdmin
      .from("restaurant_config")
      .select(CONFIG_COLUMNS)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["config:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = configSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from("restaurant_config")
      .insert([parsed as any])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Error al crear configuración" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["config:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = configUpdateSchema.parse(body);

    // Coherencia impuestos post-merge (el update es parcial): tax_enabled exige
    // tax_rate ya existente o incluido en este mismo payload.
    const { data: current } = await supabaseAdmin
      .from("restaurant_config")
      .select("tax_enabled, tax_rate")
      .limit(1)
      .maybeSingle();

    const mergedTaxEnabled = parsed.updates.tax_enabled ?? current?.tax_enabled ?? false;
    const mergedTaxRate =
      parsed.updates.tax_rate !== undefined ? parsed.updates.tax_rate : (current?.tax_rate ?? null);
    if (mergedTaxEnabled && mergedTaxRate == null) {
      return NextResponse.json(
        { error: "Para activar impuestos se requiere una tasa (tax_rate)" },
        { status: 400 },
      );
    }

    const payload = { ...parsed.updates, updated_at: new Date().toISOString() };

    let query = supabaseAdmin.from("restaurant_config").update(payload as any);
    if (parsed.filters.id) query = query.eq("id", parsed.filters.id);
    const { data: updated, error } = await query.select("id");
    if (error) throw error;

    // Singleton: si no había fila, la crea (upsert) — la seed de la migración
    // normalmente ya la insertó; esto cubre BDs sin seed.
    if (!updated?.length) {
      const { error: insertError } = await supabaseAdmin
        .from("restaurant_config")
        .insert(payload as any);
      if (insertError) throw insertError;
    }

    // El layout (SEO/metadata) y /api/site-config leen de un caché con tag;
    // invalidarlo aquí (expiración inmediata) para que la landing refleje el
    // cambio sin esperar los 300s. Ver lib/site-config.server.ts.
    revalidateTag("site-config", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
