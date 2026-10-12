"use client";

import { useState, useEffect } from "react";
import { useTables, useInvalidateTables } from "@/hooks/use-tables";
import { useRestaurantConfig, useInvalidateRestaurantConfig } from "@/hooks/use-restaurant-config";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

export function useMesasManager() {
  const { data: tables = [], isLoading, isError } = useTables();
  const invalidateTables = useInvalidateTables();
  const { data: configData } = useRestaurantConfig();
  const invalidateConfig = useInvalidateRestaurantConfig();

  // Estados de carga y modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Formulario para nueva mesa
  const [newMesa, setNewMesa] = useState({ number: "", capacity: 4 });

  // Estados sincrónicos del local con la Base de Datos
  const [configId, setConfigId] = useState<string | null>(configData?.id ?? null);
  const [globalSillas, setGlobalSillas] = useState(configData?.total_sillas ?? 50);

  const globalMesas = tables.length;

  // Sincronizar cuando los datos del servidor cambien
  useEffect(() => {
    setConfigId((prev: string | null) => configData?.id ?? prev);
    setGlobalSillas((prev: number) => configData?.total_sillas ?? prev);
  }, [configData?.id, configData?.total_sillas]);

  const sillasEnUsoOcupadas = tables
    .filter((t) => t.status !== "free" && t.is_active !== false)
    .reduce((acc, t) => acc + (t.capacity || 0), 0);

  const sillasEnMesasLibres = tables
    .filter((t) => t.status === "free" && t.is_active !== false)
    .reduce((acc, t) => acc + (t.capacity || 0), 0);

  const totalAsignadas = tables
    .filter((t) => t.is_active !== false)
    .reduce((acc, t) => acc + (t.capacity || 0), 0);
  const sillasRespaldoActual = Math.max(0, globalSillas - totalAsignadas);

  const sillasComprometidasBase = tables
    .filter((t) => t.is_active !== false)
    .reduce((acc, t) => acc + (t.base_seats || 0), 0);

  const sillasDisponiblesParaCreacion = Math.max(0, globalSillas - sillasComprometidasBase);

  const maxCreacion = Math.min(sillasRespaldoActual, sillasDisponiblesParaCreacion);

  const poolTotalPrestable = globalSillas - sillasEnUsoOcupadas;

  // Contadores rápidos de UI para el Header
  const totalLibres = tables.filter((t) => t.status === "free" && t.is_active !== false).length;
  const totalOcupadas = tables.filter((t) => t.status === "occupied" && t.is_active !== false).length;

  // 3. ACCIONES: Creación Individual de Mesa
  const handleCreateMesa = async () => {
    const cleanNumber = newMesa.number.trim();
    if (!cleanNumber) return;

    const base = Number(newMesa.capacity);
    if (base < 1) {
      toast.error("La mesa debe tener al menos 1 silla");
      return;
    }

    const existsLocally = tables.some((t) => t.number.toString().toLowerCase() === cleanNumber.toLowerCase());
    if (existsLocally) {
      toast.error(`La mesa "${cleanNumber}" ya existe`);
      return;
    }

    if (base > sillasDisponiblesParaCreacion) {
      toast.error(`Solo hay ${sillasDisponiblesParaCreacion} sillas base disponibles para crear mesas`);
      return;
    }

    setIsSaving(true);
    try {
      const capacityReal = Math.min(base, sillasRespaldoActual);

      const tableData = {
        number: cleanNumber,
        base_seats: base,
        capacity: capacityReal,
        status: "free" as const,
        section: "General",
      };

      const res = await apiFetch("/api/tables", {
        method: "POST",
        body: JSON.stringify(tableData),
      });
      const data = await res.json();

      if (data && configId) {
        await apiFetch("/api/restaurant-config", {
          method: "PATCH",
          body: JSON.stringify({
            filters: { id: configId },
            updates: {
              total_mesas: tables.length + 1,
              sillas_respaldo: Math.max(0, sillasRespaldoActual - capacityReal),
            },
          }),
        });
      } else if (!configId) {
        console.warn("[handleCreateMesa] Config no encontrada — total_mesas/sillas_respaldo no actualizados");
      }

      setIsCreateModalOpen(false);
      setNewMesa({ number: "", capacity: 4 });
      invalidateTables();
      invalidateConfig();
      toast.success(`Mesa ${data?.number ?? cleanNumber} integrada al mapa`);
      if (capacityReal < base) {
        toast.warning(`${base - capacityReal} silla(s) pendientes. Se asignaran cuando haya disponibilidad.`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al crear la mesa";
      console.error("[handleCreateMesa]", error);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Datos y Estados
    tables,
    isLoaded: !isLoading,
    isError,
    isSaving,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isConfigModalOpen,
    setIsConfigModalOpen,
    newMesa,
    setNewMesa,
    configId,
    setConfigId,
    globalMesas,
    globalSillas,
    setGlobalSillas,
    invalidateTables,

    // Métodos/Acciones
    handleCreateMesa,

    // Métodos Computados (useMemo)
    sillasEnUsoOcupadas,
    sillasEnMesasLibres,
    sillasRespaldoActual,
    sillasDisponiblesParaCreacion,
    maxCreacion,
    poolTotalPrestable,
    totalLibres,
    totalOcupadas,
  };
}
