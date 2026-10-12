"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Table, MesaCascadePayload } from "@/lib/types";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { rpcUpdateTableDistribution } from "@/lib/api-rpc";
import { toast } from "sonner";
import { redistribuirAumento, redistribuirReduccion } from "../_utils/chair-distribution";

interface UseGestionSillasProps {
  mesa: Table;
  tables: Table[];
  sillasRespaldoActual: number;
  onCloseParentModal?: () => void;
}

export function useGestionSillas({
  mesa,
  tables,
  sillasRespaldoActual,
  onCloseParentModal,
}: UseGestionSillasProps) {
  const queryClient = useQueryClient();
  const { data: config } = useRestaurantConfig();
  const [isSaving, setIsSaving] = useState(false);

  const save = async (guests: number, section: string) => {
    setIsSaving(true);
    try {
      const respaldoFresco = sillasRespaldoActual;
      const configId = config?.id ?? null;

      const currentGuests = mesa.currentGuests ?? (mesa.status === "occupied" ? mesa.capacity : 0);
      const diferencia = guests - currentGuests;

      if (diferencia === 0 && section === mesa.section) {
        toast.info("No se detectaron cambios en el aforo.");
        setIsSaving(false);
        return;
      }

      let nuevoRespaldoBodega = respaldoFresco;
      let mesasModificadasEnCascada: MesaCascadePayload[] = [];

      if (diferencia > 0) {
        try {
          const result = redistribuirAumento(
            diferencia,
            respaldoFresco,
            mesa.id,
            tables,
          );
          nuevoRespaldoBodega = result.nuevoRespaldoBodega;
          mesasModificadasEnCascada = result.mesasModificadasEnCascada;
        } catch (e: unknown) {
          const redistributionError = e instanceof Error ? e.message : "Sin inventario disponible";
          toast.error(redistributionError);
          setIsSaving(false);
          return;
        }
      } else if (diferencia < 0) {
        const result = redistribuirReduccion(
          Math.abs(diferencia),
          respaldoFresco,
          mesa.id,
          tables,
        );
        nuevoRespaldoBodega = result.nuevoRespaldoBodega;
        mesasModificadasEnCascada = result.mesasModificadasEnCascada;
      }

      await rpcUpdateTableDistribution({
        tableId: mesa.id,
        capacity: guests,
        currentGuests: guests,
        section,
        cascade: mesasModificadasEnCascada.map((m) => ({
          id: m.id,
          capacity: m.capacity,
          is_active: m.is_active ?? true,
        })),
        configId: nuevoRespaldoBodega !== respaldoFresco ? configId : null,
        sillasRespaldo: nuevoRespaldoBodega,
      });

      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-config"] });

      toast.success(`Servicio de la Mesa ${mesa.number} reajustado a ${guests} comensales.`, {
        description: "El mobiliario y el stock de la sala se han sincronizado.",
      });

      if (onCloseParentModal) onCloseParentModal();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al reajustar el aforo del servicio";
      console.error("[useGestionSillas]", error);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, save };
}
