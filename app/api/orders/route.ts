import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireRole } from "@/lib/api-guard";
import { orderSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { buildDefaultWindowOr } from "@/lib/status-transitions";
import { ABILITIES } from "@/lib/abilities";
import { ORDER_SELECT } from "@/lib/transforms/order-transform";

const DEFAULT_WINDOW_HOURS = 48;

function buildBaseQuery() {
  return supabaseAdmin.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
}

// Bound the default list to a rolling window (or active/unpaid orders) so the
// payload doesn't grow linearly with history. Explicit `date_from` opts into
// full history; `completed_from` filters by payment date (also exempt — a daily
// cash summary must see old orders charged today).
async function applyDefaultWindow(query: any, searchParams: URLSearchParams) {
  if (searchParams.has("date_from") || searchParams.has("completed_from")) return query;
  const { data: cfg } = await supabaseAdmin
    .from("restaurant_config")
    .select("ops")
    .limit(1)
    .maybeSingle();
  const hours = Number((cfg?.ops as { caja_window_hours?: number } | null)?.caja_window_hours ?? DEFAULT_WINDOW_HOURS);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  return query.or(buildDefaultWindowOr(since));
}

function applyFilters(query: any, searchParams: URLSearchParams) {
  if (searchParams.has("status")) query = query.eq("status", searchParams.get("status") as any);
  if (searchParams.has("table_id")) query = query.eq("table_id", searchParams.get("table_id")!);
  if (searchParams.has("payment_status")) query = query.eq("payment_status", searchParams.get("payment_status") as any);
  if (searchParams.has("type")) query = query.eq("type", searchParams.get("type") as any);
  if (searchParams.has("waiter_id")) query = query.eq("waiter_id", searchParams.get("waiter_id")!);
  if (searchParams.has("date_from")) query = query.gte("created_at", searchParams.get("date_from")!);
  if (searchParams.has("date_to")) query = query.lte("created_at", searchParams.get("date_to")!);
  if (searchParams.has("completed_from")) query = query.gte("completed_at", searchParams.get("completed_from")!);
  return query;
}

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.has("id")) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", searchParams.get("id")!)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (searchParams.has("q")) {
      const q = searchParams.get("q")!;
      const numericQ = Number(q);

      if (!isNaN(numericQ)) {
        const [byOrderNumber, byTableNumber] = await Promise.all([
          applyFilters(buildBaseQuery().eq("order_number", numericQ), searchParams),
          applyFilters(buildBaseQuery().eq("tables.number", q), searchParams),
        ]);

        if (byOrderNumber.error) throw byOrderNumber.error;
        if (byTableNumber.error) throw byTableNumber.error;

        const seen = new Set<string>();
        const merged = [...(byOrderNumber.data ?? []), ...(byTableNumber.data ?? [])].filter((o) => {
          if (seen.has(o.id)) return false;
          seen.add(o.id);
          return true;
        });

        return NextResponse.json(merged);
      } else {
        const query = applyFilters(buildBaseQuery().ilike("notes", `%${q}%`), searchParams);
        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data ?? []);
      }
    }

    const query = await applyDefaultWindow(applyFilters(buildBaseQuery(), searchParams), searchParams);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["orders:create"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = orderSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert({
        ...parsed,
        status: parsed.status ?? "pending",
        payment_status: "pending",
        total: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[orders POST] Supabase error:", error);
      return NextResponse.json({ error: "Error al crear la orden", details: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
