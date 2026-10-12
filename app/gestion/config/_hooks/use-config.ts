"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { configSchema, type ConfigInput } from "@/lib/api-schemas";
import { z } from "zod";

const fullConfigSchema = configSchema
  .extend({
    id: z.string(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .strip();

export type FullConfig = z.infer<typeof fullConfigSchema>;

export function useFullConfig() {
  return useQuery({
    queryKey: ["restaurant-config", "full"],
    queryFn: async () => {
      const res = await apiFetch("/api/restaurant-config");
      const data = await res.json();
      const parsed = fullConfigSchema.safeParse(data);
      if (!parsed.success) {
        console.error("[config] Respuesta inválida:", parsed.error.flatten());
        throw new Error("La configuración recibida no es válida");
      }
      return parsed.data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ConfigInput> }) => {
      const res = await apiFetch("/api/restaurant-config", {
        method: "PATCH",
        body: JSON.stringify({ filters: { id }, updates }),
      });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["restaurant-config"] });
      // Sidebar, landing, BrandTheme y SEO leen ["site-config"] (useSiteConfig):
      // sin invalidarlo, un cambio de identidad/colores no se refleja hasta
      // que expira su staleTime.
      void queryClient.invalidateQueries({ queryKey: ["site-config"] });
    },
  });
}

export interface UploadedAsset {
  url: string;
  width: number;
  height: number;
  mime: string;
}

export function useUploadAsset() {
  return useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: "hero" | "logo" }) => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: form });
      return (await res.json()) as UploadedAsset;
    },
  });
}
