"use client";

import { useMemo, useState } from "react";
import { BookOpen, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can } from "@/lib/abilities";
import { useAuth } from "@/lib/store";
import type { Product } from "@/lib/types";
import { useActiveProducts } from "@/hooks/use-products";
import { useRecipes, type RecipeRow } from "@/hooks/use-recipes";
import { LoadingRegion, TableSkeleton } from "@/components/gestion/skeletons";
import { RecipeDialog } from "./recipe-dialog";

function summarize(lines: RecipeRow[]): string {
  const bySize = lines.some((l) => l.size_id !== null);
  const names = lines.map((l) => l.supplies?.name ?? "Insumo").join(", ");
  return bySize ? `${names} (con tallas)` : names;
}

export function RecipesTab() {
  const { currentUser } = useAuth();
  const canManage = can(currentUser?.role, "inventory:manage");
  const { data: products = [], isLoading: productsLoading } = useActiveProducts();
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const [editing, setEditing] = useState<Product | null>(null);

  const byProduct = useMemo(() => {
    const map = new Map<string, RecipeRow[]>();
    for (const r of recipes) {
      const list = map.get(r.product_id) ?? [];
      list.push(r);
      map.set(r.product_id, list);
    }
    return map;
  }, [recipes]);

  if (productsLoading || recipesLoading) {
    return (
      <LoadingRegion label="Cargando recetas">
        <TableSkeleton rows={6} columns={4} />
      </LoadingRegion>
    );
  }

  if (products.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <BookOpen className="size-8" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Sin productos activos</EmptyTitle>
          <EmptyDescription>Crea productos en el módulo Menú para asignarles receta.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Al aceptar una orden en cocina, cada platillo descuenta sus insumos según su receta. Los productos
        sin receta no afectan el inventario.
      </p>

      <>
        {/* Escritorio — tabla */}
        <div className="hidden md:block rounded-xl border bg-card">
          <Table aria-label="Recetas por producto">
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Receta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const lines = byProduct.get(product.id) ?? [];
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium text-navy">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.category}</TableCell>
                    <TableCell className="max-w-64 truncate" title={lines.length ? summarize(lines) : undefined}>
                      {lines.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Sin receta
                        </Badge>
                      ) : (
                        <span className="text-sm">
                          {lines.length} {lines.length === 1 ? "insumo" : "insumos"} ·{" "}
                          <span className="text-muted-foreground">{summarize(lines)}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 text-blue-600 hover:bg-blue-50"
                          onClick={() => setEditing(product)}
                          aria-label={`Editar receta de ${product.name}`}
                          title="Editar receta"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Solo lectura</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Móvil — tarjetas */}
        <div className="flex flex-col gap-3 md:hidden">
          {products.map((product) => {
            const lines = byProduct.get(product.id) ?? [];
            return (
              <div
                key={product.id}
                className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-black text-navy truncate">{product.name}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {product.category}
                  </p>
                  <div className="mt-2">
                    {lines.length === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Sin receta
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {lines.length} {lines.length === 1 ? "insumo" : "insumos"} · {summarize(lines)}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-blue-600 hover:bg-blue-50 shrink-0"
                    onClick={() => setEditing(product)}
                    aria-label={`Editar receta de ${product.name}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </>

      <RecipeDialog isOpen={editing !== null} onClose={() => setEditing(null)} product={editing} />
    </div>
  );
}
