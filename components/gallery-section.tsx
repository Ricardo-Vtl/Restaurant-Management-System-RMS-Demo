"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

// Fotos stock genéricas (Unsplash, libres de uso) — no pertenecen a ningún
// negocio; el branding real vive en Config.
const galleryImages = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    alt: "Platillos recién preparados",
    className: "col-span-2 row-span-2",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    alt: "Platillo con vegetales frescos",
    className: "col-span-1 row-span-1",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80",
    alt: "Bebida de la casa",
    className: "col-span-1 row-span-1",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    alt: "Ambiente del restaurante",
    className: "col-span-1 row-span-2",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    alt: "Mesa servida",
    className: "col-span-1 row-span-1",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80",
    alt: "Cocina en preparación",
    className: "col-span-1 row-span-1",
  },
];

export function GallerySection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section id="nosotros" ref={sectionRef} className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-4">
            Nuestra <span className="text-coral">Experiencia</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Cocina hecha al momento, con ingredientes frescos y mucho sabor
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[150px] sm:auto-rows-[200px]"
        >
          {galleryImages.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={cn("relative overflow-hidden rounded-2xl group", image.className)}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/30 transition-colors duration-300" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
