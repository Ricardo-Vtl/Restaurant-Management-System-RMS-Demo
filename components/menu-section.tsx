"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { GlassWater, UtensilsCrossed, IceCream, LayoutGrid } from "lucide-react";
import { ProductCard } from "./product-card";
import { ScrollStrip } from "@/components/scroll-strip";

const ProductModal = dynamic(() => import("./product-modal").then((m) => m.ProductModal), { ssr: false, loading: () => null });
import { useActiveProducts } from "@/hooks/use-products";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  GlassWater,
  UtensilsCrossed,
  IceCream,
};

export function MenuSection() {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: allProducts = [] } = useActiveProducts();

  useEffect(() => {
    setMounted(true);
  }, []);

  const categories = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];

    const uniqueCategories = Array.from(new Set(allProducts.map((p) => p.category)));

    return uniqueCategories
      .map((cat) => {
        const lowerCat = cat.toLowerCase();
        let icon = "UtensilsCrossed";
        if (lowerCat.includes("bebida")) icon = "GlassWater";
        else if (lowerCat.includes("postre")) icon = "IceCream";

        return {
          id: lowerCat,
          name: cat,
          icon: icon,
        };
      })
      // Sin orden hardcodeado de categorías: alfabético (el catálogo manda).
      .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
  }, [allProducts]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Modificado: Ahora dejamos pasar los productos aunque available sea false para poder mostrarlos grises
  const filteredItems = useMemo(
    () => allProducts.filter((p) => p.category.toLowerCase() === activeCategory),
    [allProducts, activeCategory],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allProducts) {
      const id = p.category.toLowerCase();
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [allProducts]);

  const handleProductClick = (product: Product) => {
    // Si no está disponible, evitamos que se abra el modal o interactúe
    if (!product.available) return;
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (!mounted) return null;

  return (
    <section id="menu" className="py-24 bg-background scroll-mt-20 min-h-[60vh]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-6xl font-bold text-navy mb-4">
            Nuestro <span className="text-coral">Menú</span>
          </h2>
          <div className="w-24 h-1 bg-coral/30 mx-auto mb-6 rounded-full" />
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg italic">
            "Cada platillo se prepara al momento, con ingredientes frescos."
          </p>
        </motion.div>

        {categories.length > 0 ? (
          <div className="sticky top-20 z-30 bg-background/80 backdrop-blur-md py-6 -mx-4 px-4 mb-12 border-b border-navy/5">
            <ScrollStrip ariaLabel="Filtrar por categoría" className="flex gap-3 pb-2">
              {categories.map((cat) => {
                const Icon = iconMap[cat.icon] || UtensilsCrossed;
                // El conteo ahora refleja todos los productos vigentes expuestos
                const count = categoryCounts.get(cat.id) ?? 0;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    aria-pressed={activeCategory === cat.id}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 whitespace-nowrap",
                      activeCategory === cat.id
                        ? "bg-navy text-white shadow-lg scale-105"
                        : "bg-secondary text-navy hover:bg-secondary/80",
                    )}
                  >
                    <Icon className="size-4" />
                    {cat.name}
                    <span className="ml-1 text-xs opacity-60">({count})</span>
                  </button>
                );
              })}
            </ScrollStrip>
          </div>
        ) : (
          <div className="text-center py-20 opacity-50">
            <LayoutGrid className="size-12 mx-auto mb-4" />
            <p>Aún no hay productos disponibles en el menú.</p>
          </div>
        )}

        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "transition-all duration-300 relative",
                  // Si no está disponible, le aplicamos escala de grises, opacidad baja y deshabilitamos eventos de click
                  !item.available && "grayscale opacity-40 pointer-events-none select-none cursor-not-allowed",
                )}
              >
                <ProductCard product={item} index={index} onClick={() => handleProductClick(item)} />

                {/* Badge flotante elegante indicando "Agotado" sobre el contenedor gris */}
                {!item.available && (
                  <div className="absolute top-4 right-4 z-10 bg-destructive text-white text-[11px] font-bold uppercase px-2.5 py-1 rounded-md shadow-md tracking-wider">
                    Agotado
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
