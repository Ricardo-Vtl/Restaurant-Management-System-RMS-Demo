"use client";

import { Table } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UtensilsCrossed, LayoutGrid, Receipt, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { MenuTab } from "./tabs/MenuTab";
import { HistorialTab } from "./tabs/HistorialTab";
import { GestionTab } from "./tabs/GestionTab";

import { useMesaManagement } from "../_hooks/useMesaManagement";
import { MesaAsignacionView } from "./MesaAsignacionView";

interface MesaManagementModalProps {
  mesa: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onServiceCompleted?: () => void;
  sillasRespaldoActual: number;
  sillasEnMesasLibres: number;
  poolTotalPrestable: number;
}

export const MesaManagementModal = ({
  mesa: initialMesa,
  isOpen,
  onClose,
  onServiceCompleted,
  sillasRespaldoActual,
  sillasEnMesasLibres,
  poolTotalPrestable,
}: MesaManagementModalProps) => {
  const {
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
  } = useMesaManagement({
    initialMesa,
    isOpen,
    onClose,
    sillasRespaldoActual,
    sillasEnMesasLibres,
    poolTotalPrestable,
  });

  if (!mesa) return null;

  const isActuallyOccupied = mesa.status === "occupied" || mesa.status === "billing";
  const shouldShowOccupiedView = isActuallyOccupied;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "border-none shadow-2xl p-0 flex flex-col transition-all duration-300 ease-in-out gap-0 outline-none fixed left-[50%] -translate-x-[50%]",
          shouldShowOccupiedView
            ? "w-full h-full max-h-[90dvh] md:w-[95vw] md:h-[92vh] lg:max-w-7xl top-[50%] -translate-y-[50%] md:rounded-3xl overflow-hidden"
            : "w-[95vw] max-w-md h-auto top-[50%] -translate-y-[50%] rounded-3xl overflow-hidden",
        )}
      >
        {/* HEADER */}
        <div className={cn("p-5 md:p-8 text-white shrink-0 relative", shouldShowOccupiedView ? "bg-coral" : "bg-navy")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full size-8"
          >
            <X className="size-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
          <DialogHeader className="flex flex-col gap-0">
            <DialogDescription className="sr-only">Panel de gestión para la Mesa {mesa.number}.</DialogDescription>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <UtensilsCrossed size={24} />
              </div>
              <div className="flex flex-col gap-0.5 text-left">
                <DialogTitle className="font-black italic tracking-tighter uppercase text-2xl text-white m-0 p-0 leading-none">
                  Mesa {mesa.number}
                </DialogTitle>
                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest pt-1">
                  {mesa.section} •{" "}
                  {shouldShowOccupiedView
                    ? `${mesa.currentGuests || guests} pax`
                    : `Sillas actuales: ${currentPhysicalCapacity}`}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* CUERPO */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden relative">
          {!shouldShowOccupiedView ? (
            <div className="flex flex-col items-center justify-center w-full h-full gap-5 p-6 mx-auto max-w-sm">
              <MesaAsignacionView
                number={mesa.number}
                guests={guests}
                isSaving={isSaving}
                isDeleting={isDeleting}
                showConfirmDelete={showConfirmDelete}
                setShowConfirmDelete={setShowConfirmDelete}
                sillasARobarDeSalaSimuladas={sillasARobarDeSalaSimuladas}
                bodegaSimulada={bodegaSimulada}
                robablesEnSalaSimuladas={robablesEnSalaSimuladas}
                maxCapacidadAbsoluta={maxCapacidadAbsoluta}
                currentPhysicalCapacity={currentPhysicalCapacity}
                baseSeats={mesa.base_seats || 0}
                onAdjustGuests={handleAdjustGuests}
                onOpenTable={handleOpenTable}
                onDeleteTable={handleDeleteTableCascade}
                isJoined={mesa.isJoined}
                isJoining={isJoining}
                isSplitting={isSplitting}
                freeTablesForJoin={freeTablesForJoin}
                onJoinTable={handleJoinTables}
                onSplitTable={handleSplitTable}
              />
            </div>
          ) : (
            <Tabs defaultValue="menu" className="flex-1 flex flex-col min-h-0">
              <div className="px-2 border-b bg-muted/80 shrink-0 z-10">
                <TabsList className="h-14 bg-transparent gap-2 w-full justify-around">
                  <TabsTrigger
                    value="menu"
                    className="h-full border-b-4 border-transparent data-[state=active]:border-coral px-1 flex items-center gap-2"
                  >
                    <LayoutGrid size={14} /> <span className="font-black text-[10px] uppercase italic">Menú</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="historial"
                    className="h-full border-b-4 border-transparent data-[state=active]:border-coral px-1 flex items-center gap-2"
                  >
                    <Receipt size={14} /> <span className="font-black text-[10px] uppercase italic">Cuenta</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="gestion"
                    className="h-full border-b-4 border-transparent data-[state=active]:border-coral px-1 flex items-center gap-2"
                  >
                    <Settings2 size={14} /> <span className="font-black text-[10px] uppercase italic">Mesa</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 relative bg-white">
                <TabsContent value="menu" className="absolute inset-0 overflow-y-auto">
                  <MenuTab mesa={mesa} />
                </TabsContent>
                <TabsContent value="historial" className="absolute inset-0 overflow-y-auto">
                  <HistorialTab
                    mesa={mesa}
                    onServiceCompleted={onServiceCompleted || onClose}
                    sillasRespaldoActual={sillasRespaldoActual}
                  />
                </TabsContent>
                <TabsContent value="gestion" className="absolute inset-0 overflow-y-auto">
                  <GestionTab
                    mesa={mesa}
                    onCloseParentModal={onClose}
                    sillasRespaldoActual={sillasRespaldoActual}
                    poolTotalPrestable={poolTotalPrestable}
                  />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
