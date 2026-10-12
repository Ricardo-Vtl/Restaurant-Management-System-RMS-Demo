"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { configSchema } from "@/lib/api-schemas";
import { z } from "zod";
import type { RestaurantConfig } from "@/lib/types";

const _configSchema = configSchema.extend({ id: z.string() }).strip();

export function useRestaurantConfig() {
  return useQuery({
    queryKey: ["restaurant-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_config")
        .select("id, sillas_respaldo, total_mesas, total_sillas, ops, tax_enabled, tax_rate, tax_label, created_at")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      const result = _configSchema.safeParse(data);
      if (!result.success) {
        console.error("[config] Validation failed:", result.error.flatten());
        return null;
      }
      return result.data as RestaurantConfig;
    },
    staleTime: 30_000,
  });
}

export function useInvalidateRestaurantConfig() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["restaurant-config"] });
}
