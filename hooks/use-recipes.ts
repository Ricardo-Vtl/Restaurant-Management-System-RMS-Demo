"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import type { RecipeSetInput } from "@/lib/api-schemas";

export interface RecipeRow {
  id: string;
  product_id: string;
  size_id: string | null;
  supply_id: string;
  quantity: number;
  supplies: { name: string; unit: string } | null;
}

export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: async (): Promise<RecipeRow[]> => {
      const res = await apiFetch("/api/recipes");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useSetRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecipeSetInput) => {
      const res = await apiFetch("/api/recipes", { method: "PUT", body: JSON.stringify(input) });
      return res.json();
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}
