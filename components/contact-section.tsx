"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { ElementType } from "react";
import { MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { InstagramIcon, FacebookIcon, TikTokIcon } from "@/components/icons/social-icons";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function ContactSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { data: config } = useSiteConfig();

  const socials = config?.socials ?? {};
  const whatsappUrl = config?.whatsapp_number ? `https://wa.me/${config.whatsapp_number}` : null;

  // Siempre visibles: sin URL configurada el icono queda como placeholder y
  // apunta a la propia landing (#inicio) hasta que el negocio ponga su enlace.
  const socialLinks: { label: string; icon: ElementType; href?: string | null }[] = [
    { label: "Instagram", icon: InstagramIcon, href: socials.instagram },
    { label: "Facebook", icon: FacebookIcon, href: socials.facebook },
    { label: "TikTok", icon: TikTokIcon, href: socials.tiktok },
    { label: "WhatsApp", icon: MessageCircle, href: whatsappUrl },
  ];
  const schedule = config?.schedule ?? {};

  return (
    <section id="contacto" ref={sectionRef} className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className={cn("grid gap-12", config?.maps_embed_url && "lg:grid-cols-2")}>
          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6">
              Visítanos o <span className="text-coral">Contáctanos</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Estamos listos para atenderte. Ordena en línea o visítanos en nuestro local.
            </p>

            {/* Contact Info — solo los datos que el negocio configuró */}
            <div className="flex flex-col gap-6 mb-8">
              {config?.address && (
                <div className="flex items-start gap-4">
                  <div className="size-12 bg-coral/10 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="size-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Ubicación</h3>
                    <p className="text-muted-foreground">{config.address}</p>
                  </div>
                </div>
              )}

              {config?.phone && (
                <div className="flex items-start gap-4">
                  <div className="size-12 bg-coral/10 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="size-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">WhatsApp</h3>
                    <p className="text-muted-foreground">{config.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="size-12 bg-coral/10 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="size-5 text-coral" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Horario</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm text-muted-foreground">
                    {DAY_LABELS.map((label, day) => {
                      const daySched = schedule[String(day) as keyof typeof schedule];
                      return (
                        <p key={label}>
                          <span className="font-medium text-foreground/70">{label}</span>{" "}
                          {daySched && !daySched.closed
                            ? `${daySched.open} – ${daySched.close}`
                            : "Cerrado"}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links — siempre visibles; sin URL apuntan a la landing */}
            <div className="flex gap-4">
              {socialLinks.map(({ label, icon: Icon, href }) => (
                <Button key={label} asChild variant="outline" size="icon" className="rounded-full size-11">
                  <a
                    href={href ?? "#inicio"}
                    {...(href ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    aria-label={href ? label : `${label} (pendiente de configurar)`}
                    title={href ? undefined : "Configura este enlace en el panel"}
                  >
                    <Icon className="size-5" aria-hidden />
                  </a>
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Map — solo si el negocio configuró su ubicación */}
          {config?.maps_embed_url && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative h-96 lg:h-full min-h-96 rounded-2xl overflow-hidden shadow-xl"
            >
              <iframe
                src={config.maps_embed_url}
                width="100%"
                height="100%"
                style={{ border: 0, filter: "grayscale(20%) contrast(1.1)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Ubicación de ${config.name || FALLBACK_NAME}`}
              />
              {/* Map Overlay */}
              <div className="absolute top-4 left-4 bg-card/95 backdrop-blur rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="size-3 bg-coral rounded-full animate-pulse" />
                  <span className="font-medium text-card-foreground">{config.name || FALLBACK_NAME}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
