"use client";

import { Table } from "@/lib/types";
import { Utensils, Users, ChefHat, Ban } from "lucide-react";
import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const MesaManagementModal = dynamic(() => import("./MesaManagementModal").then((m) => m.MesaManagementModal), { ssr: false, loading: () => null });
import { statusStyles } from "../_utils/status-styles";

interface MesaCardProps {
  mesa: Table;
  sillasRespaldoActual: number;
  sillasEnMesasLibres: number;
  poolTotalPrestable: number;
}

export const MesaCard = memo(({ mesa, sillasRespaldoActual, sillasEnMesasLibres, poolTotalPrestable }: MesaCardProps) => {
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const isDisabled = mesa.capacity === 0;
  const isOccupied = mesa.status === "occupied";

  return (
    <>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsManagementOpen(true)}
        aria-label={`Gestionar Mesa ${mesa.number}${isDisabled ? " (inactiva)" : isOccupied ? " — ocupada" : " — libre"}`}
        className={cn(
          "group relative h-44 w-full overflow-hidden rounded-xl border-2 bg-card text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
          isOccupied ? "border-coral/30 shadow-md" : "border-border shadow-sm",
          isDisabled
            ? "cursor-not-allowed border-dashed border-muted-foreground/30 bg-muted/10 opacity-40"
            : "cursor-pointer hover:border-coral/40",
        )}
      >
        {/* Barra de estado superior */}
        <span
          className={cn(
            "absolute left-0 top-0 z-10 h-1.5 w-full",
            isDisabled ? "bg-muted-foreground/20" : statusStyles[mesa.status] || "bg-muted",
          )}
          aria-hidden="true"
        />

        {/* Contenido principal */}
        <span className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center transition-all duration-300 group-hover:blur-sm group-hover:scale-95">
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-full transition-colors",
              isOccupied ? "bg-coral/10" : "bg-muted",
              isDisabled && "bg-muted-foreground/10",
            )}
          >
            {isDisabled ? (
              <Ban className="size-5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Utensils className={cn("size-5", isOccupied ? "text-coral" : "text-muted-foreground")} aria-hidden="true" />
            )}
          </span>

          <span className="leading-tight">
            <span className="block text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {isDisabled ? "Inactiva" : "Mesa"}
            </span>
            <span
              className={cn(
                "block text-3xl font-black tracking-tighter",
                isOccupied ? "text-coral" : "text-navy",
                isDisabled && "text-muted-foreground",
              )}
            >
              {mesa.number}
            </span>
          </span>

          <span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-xs font-bold text-muted-foreground/70">
            <Users className="size-3" aria-hidden="true" />
            <span>
              {isDisabled ? (
                "Sin sillas"
              ) : (
                <>
                  {(mesa.currentGuests ?? 0) > 0 ? `${mesa.currentGuests}/` : ""}
                  {mesa.capacity}
                </>
              )}
            </span>
          </span>
        </span>

        {/* Overlay de afordancia (visual) */}
        {!isDisabled && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/0 p-4 opacity-0 backdrop-blur-0 transition-all duration-300 group-hover:bg-white/70 group-hover:opacity-100 group-hover:backdrop-blur-md"
          >
            <span className="flex h-auto flex-col items-center gap-0.5 rounded-xl bg-navy px-5 py-4 text-white shadow-xl shadow-navy/20">
              <ChefHat size={20} aria-hidden="true" />
              <span className="text-xs font-black uppercase tracking-tight">Gestionar Pedido</span>
            </span>
          </span>
        )}
      </button>

      {/* MODAL DE GESTIÓN CENTRALIZADO */}
      <MesaManagementModal
        mesa={mesa}
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        sillasRespaldoActual={sillasRespaldoActual}
        sillasEnMesasLibres={sillasEnMesasLibres}
        poolTotalPrestable={poolTotalPrestable}
      />
    </>
  );
});
