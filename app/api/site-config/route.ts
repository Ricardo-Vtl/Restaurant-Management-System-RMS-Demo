import { NextResponse } from "next/server";
import { getPublicSiteConfig } from "@/lib/site-config.server";

export async function GET() {
  const data = await getPublicSiteConfig();

  return NextResponse.json(data, {
    headers: {
      // Sin caché en cliente/CDN: el caché real es unstable_cache en el
      // servidor (300s + tag "site-config" invalidado por el PATCH de config).
      // Un s-maxage aquí retrasaba el cambio hasta 5 min tras guardar.
      "Cache-Control": "no-store",
    },
  });
}
