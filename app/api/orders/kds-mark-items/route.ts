import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { kdsMarkItemsSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

export async function PATCH(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["orders:kds-mark"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { orderId, itemIds } = kdsMarkItemsSchema.parse(body);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.status !== "preparing") {
      return NextResponse.json(
        { error: `La orden debe estar en estado "preparing", actualmente: "${order.status}"` },
        { status: 400 },
      );
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("id, status")
      .eq("order_id", orderId);

    if (itemsError) {
      return NextResponse.json({ error: "Error al obtener items" }, { status: 500 });
    }

    for (const itemId of itemIds) {
      const item = items?.find((i) => i.id === itemId);
      if (!item) {
        return NextResponse.json(
          { error: `Item ${itemId} no pertenece a esta orden` },
          { status: 400 },
        );
      }
      if (item.status !== "preparing") {
        return NextResponse.json(
          { error: `Item ${itemId} debe estar en estado "preparing", actualmente: "${item.status}"` },
          { status: 400 },
        );
      }
    }

    const { error: markError } = await supabaseAdmin
      .from("order_items")
      .update({ status: "ready" })
      .in("id", itemIds);

    if (markError) {
      return NextResponse.json({ error: "Error al marcar items como listos" }, { status: 500 });
    }

    const { data: updatedItems, error: refetchError } = await supabaseAdmin
      .from("order_items")
      .select("id, status")
      .eq("order_id", orderId);

    if (refetchError) {
      return NextResponse.json({ error: "Error al verificar items" }, { status: 500 });
    }

    const nonCancelled = updatedItems?.filter((i) => i.status !== "cancelled") ?? [];
    // Items ya entregados/completados (p. ej. antes de un reopen) no bloquean la
    // promoción: la orden pasa a "ready" cuando todo lo activo está listo o más allá.
    const allReady =
      nonCancelled.length > 0 &&
      nonCancelled.every((i) => ["ready", "delivered", "completed"].includes(i.status ?? ""));

    if (allReady) {
      const { error: promoteError } = await supabaseAdmin.rpc("transition_order", {
        p_order_id: orderId,
        p_expected_status: "preparing",
        p_target_status: "ready",
      });

      if (promoteError) {
        return NextResponse.json({ error: "Error al promover la orden a lista" }, { status: 500 });
      }
    }

    return NextResponse.json({
      orderId,
      allReady,
      promotedItems: itemIds.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
