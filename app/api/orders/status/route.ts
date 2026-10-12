import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-guard";
import { orderStatusTransitionSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { canTransition, canRoleTransition } from "@/lib/status-transitions";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = orderStatusTransitionSchema.parse(body);

    const { data: current, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", parsed.id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (!canTransition(current.status as OrderStatus, parsed.status)) {
      return NextResponse.json(
        { error: `Transicion invalida: ${current.status} → ${parsed.status}` },
        { status: 400 },
      );
    }

    if (!canRoleTransition(auth.user.role as Parameters<typeof canRoleTransition>[0], current.status as OrderStatus, parsed.status)) {
      return NextResponse.json({ error: "No autorizado: permisos insuficientes para esta transicion" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.rpc("transition_order", {
      p_order_id: parsed.id,
      p_expected_status: current.status as string,
      p_target_status: parsed.status,
      p_cancel_reason: parsed.cancel_reason,
    });

    if (error) {
      return NextResponse.json({ error: "Conflicto de estado: la orden ya fue modificada" }, { status: 409 });
    }

    const { data, error: refetchError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, table_id, type, status, payment_status, total, subtotal, tax, discount, notes, waiter_id, staff_id, customer_info, accepted_at, ready_at, completed_at, cancelled_at, cancel_reason, created_at")
      .eq("id", parsed.id)
      .single();

    if (refetchError) throw refetchError;

    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
