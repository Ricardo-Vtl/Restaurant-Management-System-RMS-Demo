"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { configSchema, type HeroSlideInput, type ScheduleInput, type ChannelsInput } from "@/lib/api-schemas";

const siteConfigSchema = configSchema
  .pick({
    name: true,
    slogan: true,
    logo_url: true,
    hero_slides: true,
    brand_colors: true,
    phone: true,
    whatsapp_number: true,
    address: true,
    maps_embed_url: true,
    socials: true,
    timezone: true,
    schedule: true,
    closed_until: true,
    web_orders_enabled: true,
    channels: true,
  })
  .strip();

export interface SiteConfig {
  name: string;
  slogan: string;
  logo_url: string | null;
  hero_slides: HeroSlideInput[];
  brand_colors: { primary: string; accent: string };
  phone: string;
  whatsapp_number: string | null;
  address: string;
  maps_embed_url: string | null;
  socials: { facebook?: string; instagram?: string; tiktok?: string };
  timezone: string;
  schedule: ScheduleInput;
  closed_until: string | null;
  web_orders_enabled: boolean;
  channels: ChannelsInput;
}

export function useSiteConfig() {
  // Sin datos hasta tras el mount: el HTML del server (fallbacks) y el primer
  // render del cliente coinciden — evita el mismatch de hidratación cuando la
  // respuesta gana la carrera contra la hidratación de los componentes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const query = useQuery({
    queryKey: ["site-config"],
    queryFn: async () => {
      const res = await fetch("/api/site-config");
      if (!res.ok) throw new Error("No se pudo cargar la configuración del sitio");
      const data = await res.json();
      return siteConfigSchema.parse(data) as SiteConfig;
    },
    staleTime: 30_000,
    retry: 1,
  });

  return mounted ? query : { ...query, data: undefined };
}
