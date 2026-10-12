"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Plus, Clock } from "lucide-react";
import type { Product } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface ProductCardProps {
  product: Product;
  index: number;
  onClick: () => void;
  showPrepTime?: boolean;
  isStaffView?: boolean;
}

import { placeholderImage } from "@/lib/placeholder-images";

export const ProductCard = function ProductCard({ product, index, onClick, showPrepTime = false, isStaffView = false }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageSrc = imageError
    ? placeholderImage
    : product.image.startsWith("http")
      ? product.image
      : placeholderImage;

  const isUnavailable = !product.available;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isUnavailable || isStaffView) onClick();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={!isUnavailable ? { y: -8 } : {}}
      onClick={!isUnavailable || isStaffView ? onClick : undefined}
      tabIndex={!isUnavailable || isStaffView ? 0 : -1}
      role="button"
      onKeyDown={!isUnavailable || isStaffView ? handleKeyDown : undefined}
      className={cn(
        "group",
        !isUnavailable && "cursor-pointer",
        isUnavailable && !isStaffView && "opacity-60 cursor-not-allowed",
      )}
    >
      <div
        className={cn(
          "bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border/50",
          isUnavailable && "grayscale",
        )}
      >
        {/* Image Container */}
        <div className="relative aspect-4/3 overflow-hidden bg-muted">
          {!imageLoaded && !imageError && <Skeleton className="absolute inset-0" />}
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            priority={index === 0}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-110",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/20 transition-colors duration-300" />

          {/* Unavailable Badge */}
          {isUnavailable && (
            <div className="absolute inset-0 bg-navy/60 flex items-center justify-center">
              <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-medium text-sm">
                No Disponible
              </span>
            </div>
          )}

          {/* Quick Add Button — redirige al modal del producto */}
          {!isUnavailable && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              aria-label="Agregar al carrito"
              className="absolute bottom-3 right-3 size-10 bg-coral text-accent-foreground rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <Plus className="size-5" aria-hidden="true" />
            </motion.button>
          )}

          {/* Prep Time Badge (for staff) */}
          {showPrepTime && (
            <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-2 py-1 rounded-full flex items-center gap-1 text-xs">
              <Clock className="size-3" />
              {product.preparationTime} min
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3
            className={cn(
              "font-serif text-lg font-semibold text-card-foreground mb-1 transition-colors",
              !isUnavailable && "group-hover:text-coral",
            )}
          >
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-coral">{formatCurrency(product.basePrice)}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">MXN</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
