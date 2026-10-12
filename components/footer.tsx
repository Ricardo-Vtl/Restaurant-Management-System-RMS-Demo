"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME, FALLBACK_SLOGAN } from "@/lib/seo";
import { InstagramIcon, FacebookIcon, TikTokIcon } from "@/components/icons/social-icons";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { data: config } = useSiteConfig();
  const name = config?.name || FALLBACK_NAME;
  const socials = config?.socials ?? {};
  const whatsappUrl = config?.whatsapp_number
    ? `https://wa.me/${config.whatsapp_number}`
    : null;

  // Siempre visibles: sin URL configurada el icono queda como placeholder y
  // apunta a la propia landing (#inicio) hasta que el negocio ponga su enlace.
  const socialLinks: { label: string; icon: ElementType; href?: string | null }[] = [
    { label: "Instagram", icon: InstagramIcon, href: socials.instagram },
    { label: "Facebook", icon: FacebookIcon, href: socials.facebook },
    { label: "TikTok", icon: TikTokIcon, href: socials.tiktok },
    { label: "WhatsApp", icon: MessageCircle, href: whatsappUrl },
  ];

  return (
    <footer className="bg-navy py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl font-bold text-primary-foreground mb-4">{name}</h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              {config?.slogan || FALLBACK_SLOGAN}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Enlaces</h4>
            <nav className="flex flex-col gap-2">
              <Link href="#inicio" className="text-primary-foreground/70 hover:text-coral transition-colors text-sm">
                Inicio
              </Link>
              <Link href="#menu" className="text-primary-foreground/70 hover:text-coral transition-colors text-sm">
                Menú
              </Link>
              <Link href="#nosotros" className="text-primary-foreground/70 hover:text-coral transition-colors text-sm">
                Nosotros
              </Link>
              <Link href="#contacto" className="text-primary-foreground/70 hover:text-coral transition-colors text-sm">
                Contacto
              </Link>
            </nav>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Síguenos</h4>
            <div className="flex gap-3">
              {socialLinks.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href ?? "#inicio"}
                  {...(href ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-label={href ? label : `${label} (pendiente de configurar)`}
                  title={href ? undefined : "Configura este enlace en el panel"}
                  className="size-10 bg-primary-foreground/10 hover:bg-coral rounded-full flex items-center justify-center transition-colors"
                >
                  <Icon className="size-5 text-primary-foreground" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <Separator className="border-primary-foreground/10" />
        <div className="pt-8">
          <p className="text-center text-primary-foreground/50 text-sm">
            © {currentYear} {name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
