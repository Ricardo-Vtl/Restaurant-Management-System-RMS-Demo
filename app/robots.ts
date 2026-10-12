import type { MetadataRoute } from "next";

// Dinámico: el dominio sale de NEXT_PUBLIC_BASE_URL (cada deploy/sucursal
// configura el suyo) — antes estaba hardcodeado en public/robots.txt.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/gestion/", "/api/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
