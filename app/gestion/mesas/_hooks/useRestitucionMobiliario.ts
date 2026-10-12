"use client";

import { useState } from "react";
import type { Table } from "@/lib/types";
import { useInvalidateTables } from "@/hooks/use-tables";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { calcularRestitucionMesas, persistirRestitucion } from "../_utils/chair-distribution";
import { toast } from "sonner";

interface UseRestitucionMobiliarioProps {
  mesa: Pick<Table, "id" | "number" | "capacity" | "base_seats" | "section">;
  tables: Table[];
  sillasRespaldoActual: number;
  onServiceCompleted: () => void;
}

export function useRestitucionMobiliario({
  mesa,
  tables,
  sillasRespaldoActual,
  onServiceCompleted,
}: UseRestitucionMobiliarioProps) {
  const invalidateTables = useInvalidateTables();
  const { data: config } = useRestaurantConfig();
  const [isRestoring, setIsRestoring] = useState(false);

  const ejecutarRestitucion = async () => {
    setIsRestoring(true);
    try {
      const sillasBase = mesa.base_seats ?? mesa.capacity;
      const capacityOrigen = mesa.capacity ?? sillasBase;

      const restitucion = calcularRestitucionMesas(
        tables,
        mesa.id,
        sillasBase,
        capacityOrigen,
        sillasRespaldoActual,
      );

      await persistirRestitucion(mesa.id, config?.id ?? null, restitucion, mesa.section || "");

      invalidateTables();
      toast.success(`Mesa ${mesa.number} liberada. Mobiliario regresado a su origen.`);
      onServiceCompleted();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al reorganizar el inventario";
      console.error("[ejecutarRestitucion]", error);
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  return { isRestoring, ejecutarRestitucion };
}
