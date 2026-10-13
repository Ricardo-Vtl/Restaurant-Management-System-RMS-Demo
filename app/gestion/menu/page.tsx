"use client";

import { useMemo, useState } from "react";
import { useMenuProducts, useInvalidateProducts } from "@/hooks/use-products";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Plus,
  UtensilsCrossed,
  Loader2,
  Search,
  SearchX,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductFormModal } from "@/components/gestion/product-form-modal";
import { MenuStatsBar } from "./_components/menu-stats-bar";
import { CategoryRail, type CategoryItem } from "./_components/category-rail";
import { MenuProductCard } from "./_components/menu-product-card";
import { apiFetch } from "@/lib/api-fetch";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";
import { toast } from "sonner";

export default function MenuGestionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { data: siteConfig } = useSiteConfig();
  const restaurantName = siteConfig?.name || FALLBACK_NAME;

  const { data: products = [], isLoading, error } = useMenuProducts();
  const invalidateProducts = useInvalidateProducts();

  const categories = useMemo<CategoryItem[]>(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (s && !p.name.toLowerCase().includes(s) && !p.description?.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch("/api/products", {
        method: "PATCH",
        body: JSON.stringify({ filters: { id: deleteTarget.id }, updates: { is_active: false } }),
      });
      toast.success("Platillo eliminado del catálogo");
      invalidateProducts();
    } catch (error: unknown) {
      console.error("Error al eliminar producto:", error);
      toast.error("No se pudo eliminar el producto");
    } finally {
      setDeleteTarget(null);
    }
  };

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
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
              Gestión de Menú
            </h1>
          </div>
          <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
            Crea y personaliza la oferta de {restaurantName}
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto h-11 sm:h-9 bg-coral hover:bg-coral/90 text-white font-black uppercase italic text-xs gap-2"
        >
          <Plus className="size-4" aria-hidden="true" /> Nuevo Platillo
        </Button>
      </div>

      {/* Resumen */}
      {products.length > 0 && <MenuStatsBar products={products} />}

      {/* Búsqueda */}
      {products.length > 0 && (
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar platillo..."
            aria-label="Buscar platillo"
            className="pl-10 h-11 sm:h-10 bg-white border-border rounded-2xl text-sm sm:text-xs font-medium focus-visible:ring-coral shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Categorías */}
      {products.length > 0 && categories.length > 0 && (
        <CategoryRail
          items={categories}
          total={products.length}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
      )}

      {products.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <UtensilsCrossed className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No hay platillos aún</EmptyTitle>
            <EmptyDescription>Haz clic en &quot;Nuevo Platillo&quot; para empezar a armar tu menú.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={handleCreate} className="mt-2 bg-coral hover:bg-coral/90 text-white">
            <Plus className="size-4 mr-2" aria-hidden="true" /> Nuevo Platillo
          </Button>
        </Empty>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <SearchX className="size-10 mb-3 text-navy" aria-hidden="true" />
          <p className="text-sm font-black uppercase italic tracking-widest text-navy">
            Sin resultados
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((product) => (
            <MenuProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar platillo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar <strong>{deleteTarget?.name}</strong> del catálogo? Dejará de
              mostrarse en el menú.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
