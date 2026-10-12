import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { reopenOrderSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["orders:reopen"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = reopenOrderSchema.parse(body);

    const { error } = await supabaseAdmin.rpc("reopen_order", {
      p_order_id: parsed.id,
    });

    if (error) {
      return NextResponse.json({ error: "La orden no puede reabrirse: debe estar entregada o completada" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
