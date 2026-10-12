"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { ejecutarAlgoritmoDistribucion } from "../_utils/distribution-algorithm";

interface UseLocalSimulationProps {
  configId: string | null;
  globalMesas: number;
  globalSillas: number;
  isConfigModalOpen: boolean;
  setConfigId: (id: string | null) => void;
  setGlobalSillas: (sillas: number) => void;
  invalidateTables: () => void;
  setIsConfigModalOpen: (open: boolean) => void;
}

export function useLocalSimulation({
  configId,
  globalMesas,
  globalSillas,
  isConfigModalOpen,
  setConfigId,
  setGlobalSillas,
  invalidateTables,
  setIsConfigModalOpen,
}: UseLocalSimulationProps) {
  const [isConfigSaving, setIsConfigSaving] = useState(false);

  // Estados Borrador Sanitizados por defecto
  const [draftMesas, setDraftMesas] = useState(8);
  const [draftSillas, setDraftSillas] = useState(50);
  const [simSillasPorMesa, setSimSillasPorMesa] = useState(5);
  const [forzarRepartoTotal, setForzarRepartoTotal] = useState(false);
  const [previsualizacion, setPrevisualizacion] = useState<{ mesa: number; sillas: number }[]>([]);
  const [respaldoSimulado, setRespaldoSimulado] = useState(0);

  // Sincronizar borradores al abrir modal
  useEffect(() => {
    if (isConfigModalOpen) {
      setDraftMesas(globalMesas || 8);
      setDraftSillas(globalSillas || 50);
    }
  }, [isConfigModalOpen, globalMesas, globalSillas]);

  // Ejecutor de simulación libre de bugs de loop
  useEffect(() => {
    const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(draftMesas, draftSillas, simSillasPorMesa, forzarRepartoTotal);
    setPrevisualizacion(reparto);
    setRespaldoSimulado(respaldoCalculado);
  }, [draftMesas, draftSillas, simSillasPorMesa, forzarRepartoTotal]);

  // Guardado Atómico Blindado
  const handleGuardarConfiguracion = async () => {
    const faltaInventario = forzarRepartoTotal
      ? draftMesas > draftSillas
      : draftMesas * simSillasPorMesa > draftSillas;

    if (faltaInventario) {
      toast.error("No puedes confirmar una configuración con inventario insuficiente.");
      return;
    }

    setIsConfigSaving(true);
    let mesasCreadas: { id: string }[] | null = null;

    try {
      const payloadConfig = {
        total_mesas: Math.max(1, Number(draftMesas)),
        total_sillas: Math.max(0, Number(draftSillas)),
        sillas_respaldo: Math.max(0, respaldoSimulado),
      };

      let currentConfigId = configId;
      if (currentConfigId) {
        await apiFetch("/api/restaurant-config", {
          method: "PATCH",
          body: JSON.stringify({ filters: { id: currentConfigId }, updates: payloadConfig }),
        });
      } else {
        const res = await apiFetch("/api/restaurant-config", {
          method: "POST",
          body: JSON.stringify(payloadConfig),
        });
        const insertedConfig = await res.json();
        if (insertedConfig) {
          currentConfigId = insertedConfig.id;
          setConfigId(insertedConfig.id);
        }
      }

      const nuevasMesasPayload = previsualizacion.map((p) => ({
        number: p.mesa.toString(),
        capacity: p.sillas,
        base_seats: p.sillas,
        status: "free" as const,
        section: "General",
      }));

      const initRes = await apiFetch("/api/tables/initialize", {
        method: "POST",
        body: JSON.stringify({ tables: nuevasMesasPayload }),
      });
      mesasCreadas = await initRes.json();

      invalidateTables();
      setGlobalSillas(payloadConfig.total_sillas);

      toast.success("¡Sala inicializada con éxito!", {
        description: `Se crearon ${payloadConfig.total_mesas} mesas de forma segura.`,
      });

      setIsConfigModalOpen(false);
    } catch (error: unknown) {
      if (mesasCreadas && mesasCreadas.length > 0) {
        try {
          await apiFetch("/api/tables", {
            method: "DELETE",
            body: JSON.stringify({ ids: mesasCreadas.map((m) => m.id) }),
          });
        } catch {
          console.error("[handleGuardarConfiguracion] Rollback cleanup failed — orphaned tables may exist:", mesasCreadas);
        }
      }
      console.error("Critical core error en inicialización masiva:", error);
      toast.error("Error crítico de consistencia", {
        description: "Por favor recarga la vista para verificar el estado del mapa.",
      });
    } finally {
      setIsConfigSaving(false);
    }
  };

  return {
    draftMesas,
    setDraftMesas,
    draftSillas,
    setDraftSillas,
    simSillasPorMesa,
    setSimSillasPorMesa,
    forzarRepartoTotal,
    setForzarRepartoTotal,
    previsualizacion,
    respaldoSimulado,
    isConfigSaving,
    handleGuardarConfiguracion,
  };
}
