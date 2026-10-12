import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Subset público de configuración (landing / SEO / clientes web).
// NUNCA expone: ops, tax_rate, rfc, razon_social, ticket_footer, contadores de mesas.
const PUBLIC_COLUMNS =
  "name, slogan, logo_url, hero_slides, brand_colors, phone, whatsapp_number, address, maps_embed_url, socials, timezone, schedule, closed_until, web_orders_enabled, channels";

export type PublicSiteConfig = {
  name?: string | null;
  slogan?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  address?: string | null;
  [key: string]: unknown;
};

// Cacheado entre requests (revalidate 300 + tag "site-config"): el layout y la
// API comparten una sola lectura de BD; el PATCH de config invalida con
// revalidateTag. Si la BD no responde, el sitio sirve con los fallbacks.
export const getPublicSiteConfig = unstable_cache(
  async (): Promise<PublicSiteConfig> => {
    try {
      const { data, error } = await supabaseAdmin
        .from("restaurant_config")
        .select(PUBLIC_COLUMNS)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as PublicSiteConfig | null) ?? {};
    } catch (err) {
      console.warn("[site-config] fallback a defaults:", err);
      return {};
    }
  },
  ["public-site-config"],
  { revalidate: 300, tags: ["site-config"] },
);
