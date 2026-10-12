"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const reviews: Array<{ id: string; name: string; text: string; rating: number; date: string }> = [];

export function ReviewsSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // ponytail: aún no hay fuente de reseñas; no se pinta la sección (ni
  // ratings/estadísticas inventadas). Reaparece cuando `reviews` tenga datos.
  if (reviews.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-20 bg-navy overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            Lo que Dicen <span className="text-coral">Nuestros Clientes</span>
          </h2>
          <p className="text-primary-foreground/70 max-w-2xl mx-auto">Lo que opinan quienes nos visitan</p>
        </motion.div>

        {/* Reviews Slider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, x: 50 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="min-w-75 md:min-w-100 snap-center"
              >
                <div className="bg-navy-light/50 backdrop-blur border border-primary-foreground/10 rounded-2xl p-6 h-full">
                  <Quote className="size-8 text-coral/50 mb-4" />

                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="size-5 fill-coral text-coral" />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-primary-foreground/90 mb-6 leading-relaxed">{`"${review.text}"`}</p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-coral text-accent-foreground font-semibold">
                        {/* FIX: Se añade tipo ': string' al parámetro 'n' para resolver ts(7006) */}
                        {review.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-primary-foreground">{review.name}</div>
                      <div className="text-sm text-primary-foreground/60">{review.date}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-4 w-8 bg-linear-to-r from-navy to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-linear-to-l from-navy to-transparent pointer-events-none" />
        </motion.div>

      </div>
    </section>
  );
}
