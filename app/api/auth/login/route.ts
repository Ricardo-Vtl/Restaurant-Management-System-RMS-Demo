import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loginSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { getClientIp } from "@/lib/ip";
import { deriveAuthPassword } from "@/lib/auth-password";
import type { Database } from "@/lib/database.types";
import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const globalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:login:global",
});

const MAX_PIN_ATTEMPTS = 10;
const PIN_BLOCK_WINDOW_SECONDS = 3600;

export async function POST(req: Request) {
  try {
    // Global rate limit (anti-botnet)
    const { success: globalAllowed } = await globalRatelimit.limit("global");
    if (!globalAllowed) {
      console.error("[Auth] Límite global de login alcanzado — posible ataque de fuerza bruta");
      return NextResponse.json(
        { error: "Muchos intentos de acceso detectados. Espera un momento y vuelve a intentar." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = loginSchema.parse(body);

    const ip = getClientIp(req.headers);
    const pinKey = `login_attempts_pin:${createHash("sha256").update(parsed.pin).digest("hex")}`;

    // IP-based brute force blocking via Upstash Redis
    const attemptsKey = `login_attempts:${ip}`;
    const [attemptData, pinAttemptData] = await Promise.all([
      redis.get<number>(attemptsKey),
      redis.get<number>(pinKey),
    ]);

    if ((attemptData ?? 0) >= MAX_PIN_ATTEMPTS || (pinAttemptData ?? 0) >= MAX_PIN_ATTEMPTS) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo más tarde." },
        { status: 429 },
      );
    }

    const { data: staff, error: rpcError } = await supabaseAdmin
      .rpc("get_staff_by_pin", { p_pin: parsed.pin })
      .maybeSingle();

    // Respuesta única 401 para cualquier fallo (cierra el oráculo de enumeración de PINs)
    const failLogin = async (reason: string) => {
      await Promise.all([
        redis.setex(attemptsKey, PIN_BLOCK_WINDOW_SECONDS, (attemptData ?? 0) + 1),
        redis.setex(pinKey, PIN_BLOCK_WINDOW_SECONDS, (pinAttemptData ?? 0) + 1),
      ]);
      console.warn(`[Auth] Login fallido (${reason}) desde ${ip} (${(attemptData ?? 0) + 1}/10)`);
      return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
    };

    if (rpcError || !staff) {
      if (rpcError) console.error("[Auth] RPC get_staff_by_pin error:", rpcError.message);
      console.warn(`[Auth] Login fallido (PIN inválido) desde ${ip} (${(attemptData ?? 0) + 1}/10, len=${parsed.pin.length})`);
      return await failLogin("PIN inválido");
    }

    if (!staff?.auth_email || !staff.auth_id) {
      console.error("[Auth] Staff sin auth_email/auth_id:", staff?.id);
      return await failLogin("staff sin credenciales Auth");
    }

    // signInWithPassword en un cliente desechable: si se usara el singleton
    // supabaseAdmin, guardaría la sesión del staff en memoria y el RPC de logins
    // posteriores saldría con rol authenticated → permission denied en get_staff_by_pin.
    const { data: authData, error: signInError } = await createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    ).auth.signInWithPassword({
      email: staff.auth_email,
      password: deriveAuthPassword(staff.auth_id),
    });

    if (signInError) {
      console.error("[Auth] SignIn error:", signInError.message);
      return await failLogin("signInWithPassword falló");
    }

    await Promise.all([redis.del(attemptsKey), redis.del(pinKey)]);

    return NextResponse.json({
      session: authData.session,
      user: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        isActive: staff.is_active,
        auth_id: staff.auth_id,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
