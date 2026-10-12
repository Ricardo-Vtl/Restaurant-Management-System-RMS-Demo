// Extracción de IP confiable en proxies de borde (Vercel).
// x-forwarded-for: el cliente controla el prefijo; Vercel APENDE la IP real al final.
// x-vercel-forwarded-for: lo fija Vercel, IP única y confiable.

export function getClientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.trim();

  const xff = headers.get("x-forwarded-for");
  if (!xff) return "127.0.0.1";

  const parts = xff.split(",").map((p) => p.trim());
  return parts[parts.length - 1] || "127.0.0.1";
}
