import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getClientIp } from "@/lib/ip";

const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  timeout: 3000,
});

const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  timeout: 3000,
  prefix: "ratelimit:auth",
});

export async function proxy(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const isAuth = request.nextUrl.pathname === "/api/auth/login";
  const limiter = isAuth ? authRatelimit : ratelimit;

  const { success, pending } = await limiter.limit(ip);
  pending.catch(() => {});

  if (!success) {
    const jitter = Math.floor(Math.random() * 30);
    const retryAfter = (60 + jitter).toString();
    return NextResponse.json(
      isAuth
        ? { error: "Demasiados intentos de inicio de sesión. Espera un minuto." }
        : { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      {
        status: 429,
        headers: { "Retry-After": retryAfter },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
