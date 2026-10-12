"use client";

import { Table } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Users, ChefHat, Ban } from "lucide-react";
import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
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
  const [showOptions, setShowOptions] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const isDisabled = mesa.capacity === 0;
  const openManagement = () => { setIsManagementOpen(true); setShowOptions(false); };
  const closeManagement = () => { setIsManagementOpen(false); setShowOptions(false); };

  return (
    <>
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-300 border-2 h-44 group focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:outline-none",
          mesa.status === "occupied" ? "border-coral/30 shadow-md" : "border-border",
          isDisabled
            ? "opacity-40 border-dashed border-muted-foreground/30 shadow-none bg-muted/10 cursor-not-allowed"
            : "cursor-pointer",
        )}
        onClick={() => !isDisabled && setShowOptions(true)}
        onKeyDown={(e) => {
          if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setShowOptions(true);
          }
        }}
        tabIndex={isDisabled ? -1 : 0}
        role="button"
        aria-label={`Mesa ${mesa.number}`}
      >
        <CardContent className="p-0 h-full relative">
          {/* Barra de estado superior */}
          <div
            className={cn(
              "h-1.5 w-full absolute top-0 left-0 z-10",
              isDisabled ? "bg-muted-foreground/20" : statusStyles[mesa.status] || "bg-muted",
            )}
          />

          {/* Contenido Principal */}
          <div
            className={cn(
              "p-5 flex flex-col items-center justify-center text-center gap-2 transition-all duration-300 h-full",
              showOptions ? "blur-md scale-95" : "group-hover:blur-sm group-hover:scale-95",
            )}
          >
            <div
              className={cn(
                "size-11 rounded-full flex items-center justify-center transition-colors",
                mesa.status === "occupied" ? "bg-coral/10" : "bg-muted",
                isDisabled && "bg-muted-foreground/10",
              )}
            >
              {isDisabled ? (
                <Ban className="size-5 text-muted-foreground" />
              ) : (
                <Utensils
                  className={cn("size-5", mesa.status === "occupied" ? "text-coral" : "text-muted-foreground")}
                />
              )}
            </div>

            <div className="leading-tight">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                {isDisabled ? "Inactiva" : "Mesa"}
              </span>
              <h3
                className={cn(
                  "text-3xl font-black tracking-tighter",
                  mesa.status === "occupied" ? "text-coral" : "text-navy",
                  isDisabled && "text-muted-foreground",
                )}
              >
                {mesa.number}
              </h3>
            </div>

            {/* Contador de comensales y capacidad */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-full">
              <Users className="size-3" />
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
            </div>
          </div>

          {/* Overlay de Opciones */}
          {!isDisabled && (
            <div
              className={cn(
                "absolute inset-0 z-20 bg-white/70 backdrop-blur-md transition-all duration-300 flex flex-col items-center justify-center p-4",
                showOptions
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                className="w-full bg-navy hover:bg-navy/95 text-white rounded-xl py-6 flex flex-col h-auto gap-0.5 shadow-xl shadow-navy/20 border-b-4 border-navy-700 active:translate-y-0.5 active:border-b-0 transition-all"
                onClick={openManagement}
              >
                <ChefHat size={20} />
                <span className="text-[11px] font-black uppercase tracking-tight">Gestionar Pedido</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE GESTIÓN CENTRALIZADO */}
      <MesaManagementModal
        mesa={mesa}
        isOpen={isManagementOpen}
        onClose={closeManagement}
        sillasRespaldoActual={sillasRespaldoActual}
        sillasEnMesasLibres={sillasEnMesasLibres}
        poolTotalPrestable={poolTotalPrestable}
      />
    </>
  );
});
