import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-guard";
import { cancelOrderItemsSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = cancelOrderItemsSchema.parse(body);

    const { error } = await supabaseAdmin.rpc("cancel_order_items", {
      p_item_ids: parsed.itemIds,
    });

    if (error) {
      return NextResponse.json({ error: "Error al cancelar items" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
