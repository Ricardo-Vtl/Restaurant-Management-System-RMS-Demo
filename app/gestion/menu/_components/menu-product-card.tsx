"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { placeholderImage } from "@/lib/placeholder-images";
import type { Product } from "@/lib/types";

interface MenuProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function MenuProductCard({ product, onEdit, onDelete }: MenuProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageSrc =
    imageError || !product.image || !product.image.startsWith("http")
      ? placeholderImage
      : product.image;

  return (
    <div className="group flex flex-col rounded-2xl border border-border/50 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onError={() => setImageError(true)}
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-105",
            !product.available && "grayscale",
          )}
        />

        {/* Precio en píldora coral */}
        <span className="absolute top-3 right-3 bg-coral text-white font-black italic px-3 py-1 rounded-full text-sm shadow-md">
          {formatCurrency(product.basePrice)}
        </span>

        {/* Tiempo de preparación */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-navy shadow-sm">
          <Clock className="size-3" aria-hidden="true" />
          {product.preparationTime || 15} min
        </span>

        {!product.available && (
          <div className="absolute inset-0 bg-navy/60 flex items-center justify-center">
            <span className="bg-destructive text-white text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 flex-1">
        <div className="flex flex-col gap-1">
          <h3 className="font-serif text-lg font-bold text-navy leading-tight line-clamp-1">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-10">
            {product.description}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-border/50">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide",
              product.available ? "text-emerald-600" : "text-destructive",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                product.available ? "bg-emerald-500" : "bg-destructive",
              )}
              aria-hidden="true"
            />
            {product.available ? "Disponible" : "Agotado"}
          </span>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${product.name}`}
              className="size-11 sm:size-9 text-blue-600 hover:bg-blue-50"
              onClick={() => onEdit(product)}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${product.name}`}
              className="size-11 sm:size-9 text-destructive hover:bg-red-50"
              onClick={() => onDelete(product)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
