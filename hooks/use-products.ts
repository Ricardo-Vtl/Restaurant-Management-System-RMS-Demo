"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { productSchema } from "@/lib/api-schemas";
import { z } from "zod";
import type { Product } from "@/lib/types";

const _productSchema = productSchema.extend({ id: z.string() }).strip();

function mapProduct(data: unknown): Product {
  const result = _productSchema.safeParse(data);
  if (!result.success) {
    console.error("[mapProduct] Validation failed:", result.error.flatten());
    throw new Error("Invalid product data");
  }
  return result.data as Product;
}

export function useActiveProducts() {
  return useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error al cargar productos");
      }
      const raw: unknown = await res.json();
      const data = Array.isArray(raw) ? raw : [];
      return data
        .map((item) => {
          try {
            return mapProduct(item);
          } catch {
            return null;
          }
        })
        .filter((p): p is Product => p !== null);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMenuProducts() {
  return useQuery({
    queryKey: ["products", "menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, basePrice, category, image, available, is_active, preparationTime, hasSizes, sizes, hasSauces, sauces, hasExtras, extras, hasSpiceLevel, spiceLevels, created_at")
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (error) throw error;
      return (data ?? [])
        .map((item) => {
          try {
            return mapProduct(item);
          } catch {
            return null;
          }
        })
        .filter((p): p is Product => p !== null);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };
}
