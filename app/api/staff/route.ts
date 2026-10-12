import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { staffCreateSchema, staffUpdateSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { deriveAuthPassword } from "@/lib/auth-password";
import { ABILITIES } from "@/lib/abilities";
import type { Database } from "@/lib/database.types";

type StaffRole = Database["public"]["Enums"]["user_role"];

const STAFF_COLUMNS = "id, name, role, is_active, created_at" as const;

// El mensaje de negocio del RPC se propaga (patrón V9-DB-04 checkout → 409)
function conflictMessage(error: { message?: string }): string | null {
  return error.message?.includes("PIN ya en uso") ? error.message! : null;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["staff:manage"]);
  if (auth.error) return auth.error;

  try {
    const { data, error } = await supabaseAdmin
      .from("staff_users")
      .select(STAFF_COLUMNS)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["staff:manage"]);
  if (auth.error) return auth.error;

  let authUserId: string | null = null;
  try {
    const parsed = staffCreateSchema.parse(await req.json());

    // Usuario Auth shadow: email sintético + password derivado HMAC (V9-SEC-03).
    // Se crea con password aleatorio y se corrige al derivado una vez conocido el id.
    const authEmail = `staff-${randomUUID()}@staff.internal`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: randomUUID(),
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      console.error("[staff] createUser error:", authError?.message);
      return NextResponse.json({ error: "Error al crear credenciales de acceso" }, { status: 500 });
    }
    authUserId = authUser.user.id;

    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: deriveAuthPassword(authUserId),
    });
    if (pwError) {
      console.error("[staff] updateUserById error:", pwError.message);
      throw pwError;
    }

    const { data, error } = await supabaseAdmin.rpc("create_staff_user", {
      p_name: parsed.name,
      p_role: parsed.role as StaffRole,
      p_pin: parsed.pin,
      p_auth_id: authUserId,
      p_auth_email: authEmail,
    });

    if (error) {
      const msg = conflictMessage(error);
      if (msg) return NextResponse.json({ error: msg }, { status: 409 });
      throw error;
    }
    return NextResponse.json(data?.[0] ?? null, { status: 201 });
  } catch (err) {
    // Compensación: no dejar usuarios Auth huérfanos si falló el insert de staff
    if (authUserId) {
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
      if (delError) console.error("[staff] rollback auth user falló:", delError.message);
    }
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["staff:manage"]);
  if (auth.error) return auth.error;

  try {
    const parsed = staffUpdateSchema.parse(await req.json());
    const { id, updates } = parsed;

    // Anti-lockout: no puedes desactivarte ni degradar tu propio rol de admin
    if (id === auth.user.staffId && (updates.is_active === false || (updates.role && updates.role !== "admin"))) {
      return NextResponse.json(
        { error: "No puedes desactivar ni cambiar el rol de tu propia cuenta" },
        { status: 400 },
      );
    }

    if (updates.pin) {
      const { error } = await supabaseAdmin.rpc("set_staff_pin", { p_staff_id: id, p_pin: updates.pin });
      if (error) {
        const msg = conflictMessage(error);
        if (msg) return NextResponse.json({ error: msg }, { status: 409 });
        throw error;
      }
    }

    const fields: Partial<typeof updates> = { ...updates };
    delete fields.pin;
    if (Object.keys(fields).length > 0) {
      const { data, error } = await supabaseAdmin
        .from("staff_users")
        .update(fields)
        .eq("id", id)
        .select(STAFF_COLUMNS);

      if (error) throw error;
      if (!data?.length) {
        return NextResponse.json({ error: "Personal no encontrado" }, { status: 404 });
      }
      return NextResponse.json(data[0]);
    }

    // Solo cambió el PIN: devolver la fila actualizada
    const { data, error } = await supabaseAdmin
      .from("staff_users")
      .select(STAFF_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Personal no encontrado" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
