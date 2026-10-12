"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isOpenNow, nextOpeningText } from "@/lib/schedule";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";

const FALLBACK_ETA = "Entrega en 30-45 min";

export function HeroSection() {
  const { data: config } = useSiteConfig();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Sin slides configurados: solo fondo de color (el hero no inventa imágenes).
  const slides = config?.hero_slides ?? [];
  const hasCarousel = slides.length > 1;
  const current = slides[Math.min(currentSlide, slides.length - 1)];

  useEffect(() => {
    setCurrentSlide(0);
  }, [slides.length]);

  useEffect(() => {
    if (!hasCarousel) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [hasCarousel, slides.length]);

  const timezone = config?.timezone ?? "America/Mexico_City";
  const open = useMemo(
    () => isOpenNow(config?.schedule, timezone, config?.closed_until, now),
    [config?.schedule, config?.closed_until, timezone, now],
  );
  const nextOpening = useMemo(
    () => (open ? null : nextOpeningText(config?.schedule, timezone, config?.closed_until, now)),
    [open, config?.schedule, config?.closed_until, timezone, now],
  );

  const deliveryOn = config?.web_orders_enabled !== false && config?.channels?.delivery?.enabled !== false;
  const etaText = config?.channels?.delivery?.eta_text || FALLBACK_ETA;

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 bg-navy">
        {slides.map((slide, index) => (
          <motion.div
            key={slide.image_url + index}
            initial={{ opacity: 0 }}
            animate={{ opacity: index === currentSlide ? 0.35 : 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Image
              src={slide.image_url}
              alt={slide.title}
              fill
              priority={index === 0}
              className="object-cover"
              sizes="100vw"
            />
          </motion.div>
        ))}
        <div className="absolute inset-0 bg-linear-to-b from-navy/60 via-navy/40 to-navy/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20 pb-12">
        <div className="flex flex-col items-center text-center">
          {/* Status Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Badge
              variant="outline"
              className={cn(
                "mb-6 px-4 py-2 border-2 backdrop-blur-sm",
                open
                  ? "border-success bg-success/10 text-success"
                  : "border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/80",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full mr-2 inline-block",
                  open ? "animate-pulse bg-success" : "bg-primary-foreground/50",
                )}
              />
              {open ? "Abierto Ahora" : `Cerrado${nextOpening ? ` · Abrimos ${nextOpening}` : ""}`}
              <Clock className="size-3 ml-2 inline" />
              {deliveryOn && (
                <span className="ml-1 text-primary-foreground/80">{etaText}</span>
              )}
            </Badge>
          </motion.div>

          {/* Animated Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-4">
                {current?.title || config?.name || FALLBACK_NAME}
                {current?.subtitle && <span className="block text-coral">{current.subtitle}</span>}
              </h1>
              {(current?.description || config?.slogan) && (
                <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                  {current?.description || config?.slogan}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Slide Indicators */}
          {hasCarousel && (
            <div className="flex gap-2 mb-8">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Ir a diapositiva ${index + 1}`}
                  aria-current={index === currentSlide ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentSlide
                      ? "w-8 bg-coral"
                      : "w-2 bg-primary-foreground/30 hover:bg-primary-foreground/50",
                  )}
                />
              ))}
            </div>
          )}

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <Button
              size="lg"
              onClick={scrollToMenu}
              className="bg-coral hover:bg-coral/90 text-accent-foreground text-lg px-8 py-6 rounded-full font-medium shadow-lg shadow-coral/25 hover:shadow-xl hover:shadow-coral/30 transition-all"
            >
              Explorar Menu
              <ChevronDown className="size-5 ml-2 animate-bounce" />
            </Button>
          </motion.div>

          {/* Location — solo si el negocio la configuró */}
          {config?.address && (
            <motion.a
              href={config.maps_embed_url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 text-primary-foreground/70 hover:text-coral transition-colors group"
            >
              <MapPin className="size-4 group-hover:animate-bounce" />
              <span className="text-sm">{config.address}</span>
            </motion.a>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-primary-foreground/30 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-2 bg-coral rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
