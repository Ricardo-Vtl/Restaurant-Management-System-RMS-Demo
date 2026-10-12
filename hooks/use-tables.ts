"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { tableSchema } from "@/lib/api-schemas";
import { naturalSort } from "@/lib/natural-sort";
import { z } from "zod";
import type { Table } from "@/lib/types";

const _tableSchema = tableSchema
  .omit({ current_guests: true, capacity: true })
  .extend({
    id: z.string(),
    currentGuests: z.number().int().nullable().optional(),
    capacity: z.number().int().min(0).max(50),
  })
  .strip();

function mapTable(data: unknown): Table {
  const raw = data as Record<string, unknown>;
  const status = raw.status as string | undefined;
  const coerced = ["free", "occupied", "billing", "reserved", "closed"].includes(status ?? "free") ? status : "free";

  const result = _tableSchema.safeParse({ ...raw, status: coerced });
  if (!result.success) {
    console.error("[mapTable] Validation failed:", result.error.flatten());
    return { ...(raw as Partial<Table>), id: (raw.id as string) || "unknown", number: String(raw.number ?? "?"), capacity: Number(raw.capacity ?? 0), base_seats: Number(raw.base_seats ?? raw.capacity ?? 0), currentGuests: null, status: "free" as const, is_active: true, section: "", isJoined: false, joinedTableIds: [], totalCuenta: 0 } as Table;
  }
  return result.data as Table;
}

export function useTables() {
  return useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
    const { data, error } = await supabase
      .from("tables")
      .select("id, number, capacity, base_seats, status, section, is_active, current_guests, currentOrderId, isJoined, joinedTableIds, totalCuenta, position, originalConfig")
      .eq("is_active", true)
      .order("number", { ascending: true });

      if (error) throw error;
      return (data ?? [])
        .map((item) => {
          try {
            return mapTable(item);
          } catch {
            return null;
          }
        })
        .filter((t): t is Table => t !== null)
        .sort(naturalSort);
    },
    staleTime: 10_000,
  });
}

export function useInvalidateTables() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tables"] });
}
