import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { checkoutSchema, orderCheckoutSchema } from "@/lib/api-schemas";
import { ABILITIES } from "@/lib/abilities";

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["orders:checkout"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    // Cobro por orden individual (Caja) o por mesa completa (modal Mesas).
    const asOrder = orderCheckoutSchema.safeParse(body);
    const asTable = asOrder.success ? null : checkoutSchema.safeParse(body);

    if (!asOrder.success && !(asTable && asTable.success)) {
      return NextResponse.json({ error: "Datos inválidos", details: asOrder.error.errors.map((e) => ({ message: e.message })) }, { status: 400 });
    }

    const { error } = asOrder.success
      ? await supabaseAdmin.rpc("complete_order_checkout", {
          p_order_id: asOrder.data.orderId,
          p_payment_method: asOrder.data.paymentMethod,
        })
      : await supabaseAdmin.rpc("complete_checkout", {
          p_table_id: asTable!.data!.tableId,
          p_payment_method: asTable!.data!.paymentMethod,
        });

    if (error) {
      // Error de negocio del RPC (items en cocina, sin órdenes, mesa inexistente)
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
