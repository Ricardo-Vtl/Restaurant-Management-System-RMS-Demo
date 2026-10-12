// Bootstrap de staff para la demo (idempotente por nombre).
// Replica la secuencia de POST /api/staff: usuario Auth shadow + password
// derivado HMAC (AUTH_PASSWORD_SECRET de ESTE proyecto) + RPC create_staff_user.
//
// Uso: pnpm demo:bootstrap   (equivale a: node --env-file=.env.local scripts/demo-bootstrap.mjs)
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.AUTH_PASSWORD_SECRET;

if (!url || !serviceKey || !secret) {
  console.error("Faltan envs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_PASSWORD_SECRET");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const deriveAuthPassword = (authId) =>
  createHmac("sha256", secret).update(authId).digest("hex");

const STAFF = [
  { name: "Admin Demo", role: "admin", pin: "123456" },
  { name: "Mesero Demo", role: "waiter", pin: "111111" },
  { name: "Cocina Demo", role: "kitchen", pin: "222222" },
  { name: "Caja Demo", role: "cashier", pin: "333333" },
];

const { data: existing, error: listError } = await supabase
  .from("staff_users")
  .select("name");
if (listError) throw listError;

const existingNames = new Set((existing ?? []).map((s) => s.name));
let created = 0;

for (const person of STAFF) {
  if (existingNames.has(person.name)) {
    console.log(`= ${person.name} (${person.role}) ya existe — omitido`);
    continue;
  }

  const authEmail = `staff-${randomUUID()}@staff.internal`;
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: randomUUID(),
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    throw new Error(`createUser ${person.name}: ${authError?.message ?? "sin usuario"}`);
  }
  const authId = authUser.user.id;

  try {
    const { error: pwError } = await supabase.auth.admin.updateUserById(authId, {
      password: deriveAuthPassword(authId),
    });
    if (pwError) throw pwError;

    const { error: rpcError } = await supabase.rpc("create_staff_user", {
      p_name: person.name,
      p_role: person.role,
      p_pin: person.pin,
      p_auth_id: authId,
      p_auth_email: authEmail,
    });
    if (rpcError) throw rpcError;

    console.log(`+ ${person.name} (${person.role}) PIN ${person.pin}`);
    created++;
  } catch (err) {
    // Compensación: no dejar usuarios Auth huérfanos (espejo de /api/staff)
    await supabase.auth.admin.deleteUser(authId);
    throw err;
  }
}

console.log(`Listo: ${created} creado(s), ${STAFF.length - created} ya existía(n).`);
