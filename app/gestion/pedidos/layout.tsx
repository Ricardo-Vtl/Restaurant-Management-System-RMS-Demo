import type { Metadata } from "next";
import { getPublicSiteConfig } from "@/lib/site-config.server";
import { FALLBACK_NAME } from "@/lib/seo";

// Título con el nombre del negocio configurado (no hardcodeado).
export async function generateMetadata(): Promise<Metadata> {
  const config = await getPublicSiteConfig();
  return { title: `Pedidos | ${config.name || FALLBACK_NAME}` };
}

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
