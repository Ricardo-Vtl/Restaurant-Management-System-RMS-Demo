"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMenuProducts, useInvalidateProducts } from "@/hooks/use-products";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, UtensilsCrossed, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ProductFormModal } from "@/components/gestion/product-form-modal";
import { apiFetch } from "@/lib/api-fetch";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";
import { toast } from "sonner";

export default function MenuGestionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { data: siteConfig } = useSiteConfig();
  const restaurantName = siteConfig?.name || FALLBACK_NAME;

  const { data: products = [], isLoading, error } = useMenuProducts();
  const invalidateProducts = useInvalidateProducts();

  // 2. FUNCIÓN PARA ELIMINAR (Soft Delete definitivo sin romper llaves foráneas)
  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este platillo permanentemente del catálogo?")) return;

    try {
      await apiFetch("/api/products", {
        method: "PATCH",
        body: JSON.stringify({ filters: { id }, updates: { is_active: false } }),
      });

      toast.success("Platillo eliminado del catálogo");
      invalidateProducts();
    } catch (error: unknown) {
      console.error("Error al eliminar producto:", error);
      toast.error("No se pudo eliminar el producto");
    }
  };

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of products) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return groups;
  }, [products]);

  const categories = useMemo(() => Array.from(groupedByCategory.keys()), [groupedByCategory]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Error al cargar el menú</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-coral" />
        <p className="text-muted-foreground animate-pulse">Cargando el menú de {restaurantName}...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy font-serif">Gestión de Menú</h1>
          <p className="text-muted-foreground text-sm">Crea y personaliza la oferta de {restaurantName}</p>
        </div>
        <Button onClick={handleCreate} className="bg-coral hover:bg-coral/90">
          <Plus className="size-4 mr-2" /> Nuevo Platillo
        </Button>
      </div>

      {products.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <UtensilsCrossed className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No hay platillos aún</EmptyTitle>
            <EmptyDescription>Haz clic en "Nuevo Platillo" para empezar a armar tu menú.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-8">
          {categories.map((cat) => (
            <section key={cat} className="flex flex-col gap-4">
              <h2 className="text-lg font-bold uppercase tracking-widest text-coral border-b pb-2">{cat}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(groupedByCategory.get(cat) ?? []).map((product) => (
                    <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                      <CardContent className="p-0 flex h-36">
                        <div className="w-32 bg-muted shrink-0 relative">
                          <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                          {!product.available && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold uppercase tracking-tighter">
                                Agotado
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between overflow-hidden">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-bold text-navy truncate">{product.name}</h3>
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                                {formatCurrency(product.basePrice)}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="size-3" />
                              <span className="text-[10px]">{product.preparationTime || 15} min</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Editar producto"
                                className="size-8 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil className="size-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Eliminar producto"
                                className="size-8 text-destructive hover:bg-red-50"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          invalidateProducts();
        }}
        editingProduct={editingProduct}
      />
    </div>
  );
}
