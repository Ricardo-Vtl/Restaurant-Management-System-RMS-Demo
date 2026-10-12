import type { Metadata } from "next";

// Identidad de marca para SEO (subset de restaurant_config que el sitio público
// necesita). Todo con fallback: la BD puede estar vacía o caída.
export interface SiteIdentity {
  name?: string | null;
  slogan?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  address?: string | null;
}

// Marca genérica para BDs vacías o caídas: el negocio real viene de config
// (nombre/lema/logo/contacto). Sin datos de ningún negocio en particular.
export const FALLBACK_NAME = "La Buena Mesa";
export const FALLBACK_SLOGAN = "Comida fresca y bien hecha, directo a tu mesa.";
export const FALLBACK_DESCRIPTION =
  "Cocina para todos los gustos. Ordena en línea o visítanos.";
export const FALLBACK_ICON = "/icon.svg";

export interface RestaurantJsonLd {
  "@context": "https://schema.org";
  "@type": "Restaurant";
  name: string;
  description: string;
  url: string;
  image: string;
  priceRange: string;
  acceptsReservations: false;
  telephone?: string;
  address?: { "@type": "PostalAddress"; streetAddress: string; addressCountry: string };
}

function identity(cfg: SiteIdentity) {
  return {
    name: cfg.name?.trim() || FALLBACK_NAME,
    description: cfg.slogan?.trim() || FALLBACK_DESCRIPTION,
    logo: cfg.logo_url || null,
    phone: cfg.phone?.trim() || null,
    address: cfg.address?.trim() || null,
  };
}

export function buildSiteMetadata(cfg: SiteIdentity, baseUrl: string): Metadata {
  const { name, description, logo } = identity(cfg);
  const image = logo || FALLBACK_ICON;

  return {
    metadataBase: new URL(baseUrl),
    alternates: { canonical: baseUrl },
    title: name,
    description,
    icons: {
      icon: [{ url: FALLBACK_ICON, type: "image/svg+xml" }],
    },
    openGraph: {
      title: name,
      description,
      url: baseUrl,
      siteName: name,
      locale: "es_MX",
      type: "website",
      images: [{ url: image, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [image],
    },
  };
}

// Solo datos reales de config: sin ciudad/geo inventados (address es texto libre).
export function buildRestaurantJsonLd(cfg: SiteIdentity, baseUrl: string): RestaurantJsonLd {
  const { name, description, logo, phone, address } = identity(cfg);

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
    description,
    url: baseUrl,
    image: logo || `${baseUrl}${FALLBACK_ICON}`,
    priceRange: "$$",
    acceptsReservations: false,
    ...(phone ? { telephone: phone } : {}),
    ...(address
      ? { address: { "@type": "PostalAddress" as const, streetAddress: address, addressCountry: "MX" } }
      : {}),
  };
}
