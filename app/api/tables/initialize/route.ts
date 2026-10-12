import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";
import { z } from "zod";

const initializeTablesSchema = z.object({
  tables: z.array(z.object({
    number: z.string().min(1).max(50),
    capacity: z.number().int().min(0).max(50),
    base_seats: z.number().int().min(0).max(50).optional(),
    status: z.enum(["free", "occupied", "billing", "reserved", "closed"]).default("free"),
    section: z.string().max(50).default("General"),
  })).min(1),
});

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["tables:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = initializeTablesSchema.parse(body);

    const { data, error } = await supabaseAdmin.rpc("initialize_tables", {
      p_tables_json: parsed.tables,
    });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}
