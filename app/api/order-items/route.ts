import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-guard";
import { orderItemSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { priceOrderItems, type CatalogProduct } from "@/lib/pricing";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.has("id")) {
      const { data, error } = await supabaseAdmin
        .from("order_items")
        .select("id, order_id, product_id, quantity, unit_price, total_price, modifiers, status, created_at, products(name)")
        .eq("id", searchParams.get("id")!)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json(data);
    }

    let query = supabaseAdmin.from("order_items").select("id, order_id, product_id, quantity, unit_price, total_price, modifiers, status, created_at, products(name)");

    if (searchParams.has("order_id")) query = query.eq("order_id", searchParams.get("order_id")!);
    if (searchParams.has("status")) query = query.eq("status", searchParams.get("status")!);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    const isArray = Array.isArray(body);
    const parsed = isArray
      ? body.map((item: unknown) => orderItemSchema.parse(item))
      : [orderItemSchema.parse(body)];

    const orderIds = new Set(parsed.map((item) => item.order_id));
    if (orderIds.size !== 1) {
      return NextResponse.json({ error: "Todos los items deben pertenecer a la misma orden" }, { status: 400 });
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, basePrice, sizes, sauces, extras")
      .in("id", parsed.map((item) => item.product_id));

    if (productsError) throw productsError;

    const priced = priceOrderItems(products as unknown as CatalogProduct[], parsed);

    const { error } = await supabaseAdmin.rpc("add_order_items", {
      p_order_id: parsed[0].order_id,
      p_items: priced.map((item, idx) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        modifiers: parsed[idx]?.modifiers ?? {},
      })),
    });

    if (error) {
      return NextResponse.json({ error: "Error al crear item(s)" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
