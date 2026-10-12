"use client";

import { useState } from "react";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { MesaCard } from "./_components/mesa-card";

// Importaciones de nuestra arquitectura limpia
import { useMesasManager } from "./_hooks/useMesasManager";
import { useLocalSimulation } from "./_hooks/useLocalSimulation";
import { MesasHeader } from "./_components/mesas-header";
import { NuevaMesaModal } from "./_components/NuevaMesaModal";
import { ConfiguracionLocalModal } from "./_components/ConfiguracionLocalModal";

export default function MesasPage() {
  // 1. Hook de control principal
  const manager = useMesasManager();
  const [search, setSearch] = useState("");

  const filteredTables = search
    ? manager.tables.filter((t) => t.number.toLowerCase().includes(search.toLowerCase()))
    : manager.tables;

  const simulation = useLocalSimulation({
    configId: manager.configId,
    globalMesas: manager.globalMesas,
    globalSillas: manager.globalSillas,
    isConfigModalOpen: manager.isConfigModalOpen,
    setConfigId: manager.setConfigId,
    setGlobalSillas: manager.setGlobalSillas,
    invalidateTables: manager.invalidateTables,
    setIsConfigModalOpen: manager.setIsConfigModalOpen,
  });

  // Estado de carga inicial (Pantalla de carga)
  if (!manager.isLoaded) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-coral" size={40} />
      </div>
    );
  }

  if (manager.isError) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4">
          <AlertTriangle className="text-destructive" size={40} />
          <p className="text-muted-foreground">Error al cargar las mesas. Recarga la página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header de Estadísticas */}
      <MesasHeader
        totalLibres={manager.totalLibres}
        totalOcupadas={manager.totalOcupadas}
        sillasRespaldoActual={manager.sillasRespaldoActual}
      />

      {/* 2. Barra de Herramientas */}
      <div className="flex flex-wrap items-center gap-3 justify-between -mt-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar mesa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-0 h-10 rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
        <ConfiguracionLocalModal
          isOpen={manager.isConfigModalOpen}
          setIsOpen={manager.setIsConfigModalOpen}
          hasOccupiedTables={manager.tables.some((t) => t.status !== "free")}
          draftMesas={simulation.draftMesas}
          setDraftMesas={simulation.setDraftMesas}
          draftSillas={simulation.draftSillas}
          setDraftSillas={simulation.setDraftSillas}
          simSillasPorMesa={simulation.simSillasPorMesa}
          setSimSillasPorMesa={simulation.setSimSillasPorMesa}
          forzarRepartoTotal={simulation.forzarRepartoTotal}
          setForzarRepartoTotal={simulation.setForzarRepartoTotal}
          previsualizacion={simulation.previsualizacion}
          respaldoSimulado={simulation.respaldoSimulado}
          isConfigSaving={simulation.isConfigSaving}
          onSave={simulation.handleGuardarConfiguracion}
        />

        <NuevaMesaModal
          isOpen={manager.isCreateModalOpen}
          setIsOpen={manager.setIsCreateModalOpen}
          newMesa={manager.newMesa}
          setNewMesa={manager.setNewMesa}
          isSaving={manager.isSaving}
          onSave={manager.handleCreateMesa}
          sillasDisponibles={manager.sillasDisponiblesParaCreacion}
          sillasRespaldo={manager.sillasRespaldoActual}
        />
        </div>
      </div>

      {/* 3. Grilla Principal del Mapa de Mesas */}
      {filteredTables.length === 0 ? (
        <Empty>
          <EmptyDescription>{search ? "No se encontraron mesas con ese numero." : "No hay mesas creadas en el mapa actual."}</EmptyDescription>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
          {filteredTables.map((table) => (
            <MesaCard
              key={table.id}
              mesa={table}
              sillasRespaldoActual={manager.sillasRespaldoActual}
              sillasEnMesasLibres={manager.sillasEnMesasLibres}
              poolTotalPrestable={manager.poolTotalPrestable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
