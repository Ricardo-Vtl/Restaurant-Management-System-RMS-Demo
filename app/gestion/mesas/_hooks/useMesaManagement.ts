"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, MesaCascadePayload } from "@/lib/types";
import { useTables, useInvalidateTables } from "@/hooks/use-tables";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { rpcUpdateTableDistribution } from "@/lib/api-rpc";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { redistribuirAumento, redistribuirReduccion } from "../_utils/chair-distribution";

interface UseMesaManagementProps {
  initialMesa: Table | null;
  isOpen: boolean;
  onClose: () => void;
  sillasRespaldoActual: number;
  sillasEnMesasLibres: number;
  poolTotalPrestable: number;
}

export function useMesaManagement({
  initialMesa,
  isOpen,
  onClose,
  sillasRespaldoActual,
  sillasEnMesasLibres,
  poolTotalPrestable,
}: UseMesaManagementProps) {
  const { data: tables = [] } = useTables();
  const invalidateTables = useInvalidateTables();
  const { data: config } = useRestaurantConfig();
  const [guests, setGuests] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showJoinSelector, setShowJoinSelector] = useState(false);
  const [pendingJoinChildId, setPendingJoinChildId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const configId = config?.id ?? null;

  const mesa = useMemo(() => {
    if (!initialMesa) return null;
    return tables.find((t) => t.id === initialMesa.id) || initialMesa;
  }, [tables, initialMesa]);

  const currentPhysicalCapacity = mesa?.capacity ?? 4;

  const maxCapacidadAbsoluta = useMemo(() => {
    return mesa?.status === "free" ? poolTotalPrestable : currentPhysicalCapacity + poolTotalPrestable;
  }, [mesa?.status, currentPhysicalCapacity, poolTotalPrestable]);

  const sillasExtrasRequeridas = useMemo(() => {
    return Math.max(0, guests - currentPhysicalCapacity);
  }, [guests, currentPhysicalCapacity]);

  const bodegaSimulada = useMemo(() => {
    return Math.max(0, sillasRespaldoActual - sillasExtrasRequeridas);
  }, [sillasRespaldoActual, sillasExtrasRequeridas]);

  const sillasARobarDeSalaSimuladas = useMemo(() => {
    return Math.max(0, sillasExtrasRequeridas - sillasRespaldoActual);
  }, [sillasExtrasRequeridas, sillasRespaldoActual]);

  const robablesEnSalaSimuladas = useMemo(() => {
    const baseSala = sillasEnMesasLibres;
    if (mesa?.status === "free") {
      const sillasConsumidasDeSiMisma = Math.min(guests, currentPhysicalCapacity);
      return Math.max(0, baseSala - sillasConsumidasDeSiMisma - sillasARobarDeSalaSimuladas);
    }
    return Math.max(0, baseSala - sillasARobarDeSalaSimuladas);
  }, [sillasEnMesasLibres, guests, currentPhysicalCapacity, mesa?.status, sillasARobarDeSalaSimuladas]);

  const freeTablesForJoin = useMemo(() => {
    if (!mesa) return [];
    return tables
      .filter(
        (t) =>
          t.id !== mesa.id &&
          t.status === "free" &&
          t.is_active !== false &&
          !t.isJoined &&
          t.capacity >= (t.base_seats || 0),
      )
      .map((t) => ({ id: t.id, number: t.number }));
  }, [tables, mesa]);

  useEffect(() => {
    if (isOpen) {
      setShowConfirmDelete(false);
      if (mesa) setGuests(mesa.currentGuests ?? mesa.capacity ?? 2);
    }
  }, [isOpen, mesa?.id]);

  const handleAdjustGuests = (amount: number) => {
    setGuests((prev) => {
      const newVal = prev + amount;
      if (newVal < 1) return 1;
      if (newVal > maxCapacidadAbsoluta) return maxCapacidadAbsoluta;
      return newVal;
    });
  };

  const handleDeleteTableCascade = async () => {
    if (!mesa) return;
    setIsDeleting(true);
    try {
      const sillasHuerfanas = mesa.base_seats || currentPhysicalCapacity;

      const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(
        sillasHuerfanas,
        sillasRespaldoActual,
        mesa.id,
        tables,
      );

      const mesasABeneficiarInversamente: MesaCascadePayload[] = mesasModificadasEnCascada.map((m) => ({
        ...m,
        number: tables.find((t) => t.id === m.id)?.number ?? "",
      }));

      await rpcUpdateTableDistribution({
        tableId: mesa.id,
        capacity: mesa.capacity || currentPhysicalCapacity,
        currentGuests: mesa.currentGuests ?? 0,
        section: mesa.section || "",
        cascade: mesasABeneficiarInversamente.map((m) => ({
          id: m.id,
          capacity: m.capacity,
          is_active: m.is_active,
        })),
        configId: configId,
        sillasRespaldo: nuevoRespaldoBodega,
      });

      await apiFetch("/api/tables", {
        method: "DELETE",
        body: JSON.stringify({ eq: { id: mesa.id } }),
      });

      if (configId) {
        await apiFetch("/api/restaurant-config", {
          method: "PATCH",
          body: JSON.stringify({
            filters: { id: configId },
            updates: { total_mesas: Math.max(0, tables.length - 1) },
          }),
        });
      } else {
        console.warn("[handleDeleteTableCascade] Config no encontrada — total_mesas no actualizado");
      }

      invalidateTables();

      toast.success(`Mesa ${mesa.number} eliminada permanentemente.`, {
        description:
          mesasABeneficiarInversamente.length > 0
            ? `Mobiliario redistribuido en: ${mesasABeneficiarInversamente.map((m) => m.number).join(", ")}.`
            : `Sillas devueltas a bodega.`,
      });

      setShowConfirmDelete(false);
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error crítico en eliminación";
      console.error("[deleteTableCascade]", error);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJoinTables = async (childId: string) => {
    if (!mesa) return;
    const child = tables.find((t) => t.id === childId);
    if (!child || child.status !== "free") {
      toast.error("La mesa seleccionada no esta disponible.");
      return;
    }
    setIsJoining(true);
    try {
      const newNumber = `${mesa.number}+${child.number}`;
      const newCapacity = mesa.capacity + child.capacity;
      const newBaseSeats = (mesa.base_seats || 0) + (child.base_seats || 0);
      const newJoinedIds = [...mesa.joinedTableIds, child.id];

      await apiFetch("/api/tables", {
        method: "PATCH",
        body: JSON.stringify({
          filters: { id: mesa.id },
          updates: {
            number: newNumber,
            capacity: newCapacity,
            base_seats: newBaseSeats,
            isJoined: true,
            joinedTableIds: newJoinedIds,
            originalConfig: mesa.originalConfig || {
              number: mesa.number,
              capacity: mesa.capacity,
              base_seats: mesa.base_seats || 0,
            },
          },
        }),
      });

      await apiFetch("/api/tables", {
        method: "PATCH",
        body: JSON.stringify({ filters: { id: child.id }, updates: { is_active: false } }),
      });

      if (configId) {
        await apiFetch("/api/restaurant-config", {
          method: "PATCH",
          body: JSON.stringify({ filters: { id: configId }, updates: { total_mesas: Math.max(1, tables.length - 1) } }),
        });
      } else {
        console.warn("[handleJoinTables] Config no encontrada — total_mesas no actualizado");
      }

      invalidateTables();
      toast.success(`Mesas ${newNumber} unidas correctamente.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al unir mesas";
      console.error("[handleJoinTables]", error);
      toast.error(msg);
    } finally {
      setIsJoining(false);
      setShowJoinSelector(false);
    }
  };

  const handleSplitTable = async () => {
    if (!mesa) return;
    if (!mesa.isJoined || !mesa.originalConfig) {
      toast.error("Esta mesa no esta unida a otra o faltan datos de configuracion original.");
      return;
    }
    setIsSplitting(true);
    try {
      await apiFetch("/api/tables", {
        method: "PATCH",
        body: JSON.stringify({
          filters: { id: mesa.id },
          updates: {
            number: mesa.originalConfig.number,
            capacity: mesa.originalConfig.capacity,
            base_seats: mesa.originalConfig.base_seats || mesa.base_seats,
            isJoined: false,
            joinedTableIds: [],
            originalConfig: null,
          },
        }),
      });

      let reactivated = 0;
      for (const childId of mesa.joinedTableIds) {
        await apiFetch("/api/tables", {
          method: "PATCH",
          body: JSON.stringify({ filters: { id: childId }, updates: { is_active: true } }),
        });
        reactivated++;
      }

      if (configId) {
        await apiFetch("/api/restaurant-config", {
          method: "PATCH",
          body: JSON.stringify({ filters: { id: configId }, updates: { total_mesas: tables.length + reactivated } }),
        });
      } else {
        console.warn("[handleSplitTable] Config no encontrada — total_mesas no actualizado");
      }

      invalidateTables();
      toast.success(`Mesa ${mesa.originalConfig.number} dividida correctamente.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al dividir mesa";
      console.error("[handleSplitTable]", error);
      toast.error(msg);
    } finally {
      setIsSplitting(false);
    }
  };

  const handleOpenTable = async () => {
    if (!mesa) return;

    setIsSaving(true);
    try {
      const res = await apiFetch("/api/tables", {
        method: "PATCH",
        body: JSON.stringify({
          filters: { id: mesa.id, status: "free" },
          updates: { status: "occupied" },
        }),
      });
      const updated = await res.json();
      if (!Array.isArray(updated) || updated.length === 0) {
        toast.error(`La mesa ${mesa.number} ya no esta disponible.`);
        onClose();
        invalidateTables();
        return;
      }

      const { nuevoRespaldoBodega, mesasModificadasEnCascada } =
        guests > currentPhysicalCapacity
          ? redistribuirAumento(guests - currentPhysicalCapacity, sillasRespaldoActual, mesa.id, tables)
          : guests < currentPhysicalCapacity
            ? redistribuirReduccion(currentPhysicalCapacity - guests, sillasRespaldoActual, mesa.id, tables)
            : { nuevoRespaldoBodega: sillasRespaldoActual, mesasModificadasEnCascada: [] as MesaCascadePayload[] };

      await rpcUpdateTableDistribution({
        tableId: mesa.id,
        capacity: guests,
        currentGuests: guests,
        section: mesa.section || "",
        cascade: mesasModificadasEnCascada,
        configId: nuevoRespaldoBodega !== sillasRespaldoActual ? configId : null,
        sillasRespaldo: nuevoRespaldoBodega,
      });

      invalidateTables();
      toast.success(`Mesa ${mesa.number} abierta con ${guests} comensales.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error en apertura";
      console.error("Error en apertura:", error);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    mesa,
    guests,
    isSaving,
    showConfirmDelete,
    setShowConfirmDelete,
    isDeleting,
    bodegaSimulada,
    sillasARobarDeSalaSimuladas,
    robablesEnSalaSimuladas,
    maxCapacidadAbsoluta,
    currentPhysicalCapacity,
    handleAdjustGuests,
    handleDeleteTableCascade,
    handleOpenTable,
    handleJoinTables,
    handleSplitTable,
    showJoinSelector,
    setShowJoinSelector,
    isJoining,
    isSplitting,
    freeTablesForJoin,
  };
}
