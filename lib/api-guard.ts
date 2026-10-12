import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-admin";

interface AuthResult {
  user: { id: string; email?: string; staffId: string; role: string };
  error?: never;
}

interface AuthError {
  user?: never;
  error: NextResponse;
}

export async function requireAuth(request: Request): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { error: NextResponse.json({ error: "Sesión inválida" }, { status: 401 }) };
  }

  const { data: staff, error: staffError } = await supabaseAdmin
    .from("staff_users")
    .select("id, role")
    .eq("auth_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (staffError || !staff) {
    return { error: NextResponse.json({ error: "No autorizado: solo personal activo" }, { status: 401 }) };
  }

  return { user: { id: user.id, email: user.email, staffId: staff.id, role: staff.role } };
}

export async function requireRole(request: Request, ...roles: string[]): Promise<AuthResult | AuthError> {
  const auth = await requireAuth(request);
  if (auth.error) return auth;

  if (!roles.includes(auth.user.role)) {
    return { error: NextResponse.json({ error: "No autorizado: permisos insuficientes" }, { status: 403 }) };
  }

  return auth;
}
