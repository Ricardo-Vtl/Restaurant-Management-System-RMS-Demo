"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ArrowRight, Loader2, Trash2, AlertTriangle, X, Link, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import { can } from "@/lib/abilities";
import type { UserRole } from "@/lib/types";

interface MesaAsignacionViewProps {
  number: string;
  guests: number;
  isSaving: boolean;
  isDeleting: boolean;
  showConfirmDelete: boolean;
  setShowConfirmDelete: (val: boolean) => void;
  sillasARobarDeSalaSimuladas: number;
  bodegaSimulada: number;
  robablesEnSalaSimuladas: number;
  maxCapacidadAbsoluta: number;
  currentPhysicalCapacity: number;
  baseSeats: number;
  onAdjustGuests: (amount: number) => void;
  onOpenTable: () => void;
  onDeleteTable: () => void;
  isJoined: boolean;
  isJoining: boolean;
  isSplitting: boolean;
  freeTablesForJoin: Array<{ id: string; number: string }>;
  onJoinTable: (childId: string) => void;
  onSplitTable: () => void;
}

export function MesaAsignacionView({
  number,
  guests,
  isSaving,
  isDeleting,
  showConfirmDelete,
  setShowConfirmDelete,
  sillasARobarDeSalaSimuladas,
  bodegaSimulada,
  robablesEnSalaSimuladas,
  maxCapacidadAbsoluta,
  currentPhysicalCapacity,
  baseSeats,
  onAdjustGuests,
  onOpenTable,
  onDeleteTable,
  isJoined,
  isJoining,
  isSplitting,
  freeTablesForJoin,
  onJoinTable,
  onSplitTable,
}: MesaAsignacionViewProps) {
  const role = useAuthStore(useShallow((s) => s.currentUser?.role)) as UserRole | undefined;
  const canManage = can(role, "tables:manage");

  if (!showConfirmDelete) {
    return (
      <>
        <div className="text-center flex flex-col gap-1">
          <h3 className="text-navy font-black text-2xl italic uppercase">Asignación</h3>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Algoritmo de préstamo dinámico</p>
        </div>

        {sillasARobarDeSalaSimuladas > 0 && (
          <Alert variant="destructive" className="animate-pulse">
            <AlertTriangle className="size-4" />
            <AlertTitle>¡Bodega Vacía!</AlertTitle>
            <AlertDescription>
              Desmantelando <strong>{sillasARobarDeSalaSimuladas}</strong> sillas de sala.
            </AlertDescription>
          </Alert>
        )}

        <div className="w-full flex flex-col gap-4">
          <div className="flex items-center justify-between bg-muted p-4 rounded-3xl border border-border">
            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-full border-2 text-navy"
              onClick={() => onAdjustGuests(-1)}
              disabled={guests <= 1 || isSaving}
              aria-label="Reducir comensales"
            >
              <Minus size={20} />
            </Button>

            <div className="text-center">
              <span
                className={cn(
                  "font-black italic text-5xl block transition-colors duration-200",
                  sillasARobarDeSalaSimuladas > 0
                    ? "text-red-500"
                    : guests > currentPhysicalCapacity
                      ? "text-amber-500"
                      : "text-coral",
                )}
              >
                {guests}
              </span>
              <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mt-1 block">
                Comensales
              </Label>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-full border-2 text-navy"
              onClick={() => onAdjustGuests(1)}
              disabled={guests >= maxCapacidadAbsoluta || isSaving}
              aria-label="Aumentar comensales"
            >
              <Plus size={20} />
            </Button>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider text-center">
          <Badge
            variant="outline"
            className={cn(
              "p-2 rounded-lg justify-center",
              bodegaSimulada === 0 ? "bg-red-50 text-red-400 line-through opacity-50" : "bg-amber-50 text-amber-800",
            )}
          >
            En Bodega: {bodegaSimulada}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "p-2 rounded-lg justify-center",
              sillasARobarDeSalaSimuladas > 0
                ? "bg-red-100 text-red-700 border-red-200 animate-pulse"
                : "bg-blue-50 text-blue-800",
            )}
          >
            En Sala: {robablesEnSalaSimuladas}
          </Badge>
        </div>

        <Button
          onClick={onOpenTable}
          disabled={isSaving}
          aria-label="Confirmar y Abrir"
          aria-describedby="confirmar-abrir-desc"
          className="w-full py-6 bg-navy text-white rounded-2xl flex items-center justify-between px-6 shadow-xl transition-transform active:scale-95"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="bg-coral p-2 rounded-lg">
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
            </div>
            <div>
              <span className="block font-black text-md leading-none italic uppercase">
                {isSaving ? "Reorganizando..." : "Confirmar y Abrir"}
              </span>
              <span id="confirmar-abrir-desc" className="text-[8px] text-white/40 font-bold uppercase mt-1 block">
                Ejecutar desmantelamiento de mesas
              </span>
            </div>
          </div>
        </Button>

        {canManage && (
          <Button
            variant="ghost"
            onClick={() => setShowConfirmDelete(true)}
            disabled={isSaving}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 w-full rounded-xl py-3 font-black text-[10px] uppercase tracking-widest gap-2 italic"
          >
            <Trash2 size={14} /> Eliminar Mesa del Local
          </Button>
        )}

        {canManage && (isJoined ? (
          <Button
            variant="outline"
            onClick={onSplitTable}
            disabled={isSplitting || isSaving}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 w-full rounded-xl py-3 font-black text-[10px] uppercase tracking-widest gap-2 italic"
          >
            {isSplitting ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
            Dividir Mesa
          </Button>
        ) : freeTablesForJoin.length > 0 ? (
          <div className="w-full flex flex-col gap-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center">
              Unir con mesa
            </p>
            <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto">
              {freeTablesForJoin.map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  disabled={isJoining || isSaving}
                  onClick={() => onJoinTable(t.id)}
                  aria-label={`Unir con mesa ${t.number}`}
                  className="h-8 rounded-lg text-[10px] font-black border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Link size={10} className="mr-1" /> {t.number}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[9px] text-muted-foreground/60 italic">No hay mesas libres para unir</p>
        ))}
      </>
    );
  }

  return (
    <Alert variant="destructive" className="p-5 flex flex-col gap-5 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="size-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
        <AlertTriangle size={24} />
      </div>
      <AlertTitle className="text-red-600 font-black text-lg italic uppercase leading-none col-start-auto text-center">
        ¿Eliminar Mesa {number}?
      </AlertTitle>
      <AlertDescription className="text-[10px] font-bold text-red-400 uppercase tracking-wide pt-1 col-start-auto text-center">
        Esta acción es irreversible
      </AlertDescription>
      <p className="text-[11px] font-bold text-foreground/60 uppercase leading-snug col-start-auto">
        Las <span className="text-red-600 font-black">{baseSeats || currentPhysicalCapacity}</span> sillas físicas se
        redistribuirán solidariamente en la sala.
      </p>
      <div className="flex flex-col gap-2 pt-2 col-start-auto">
        <Button
          onClick={onDeleteTable}
          disabled={isDeleting}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider italic flex items-center justify-center gap-2"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Sí, confirmar eliminación
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowConfirmDelete(false)}
          disabled={isDeleting}
          className="w-full py-4 border-2 border-border text-muted-foreground hover:bg-muted rounded-xl font-black text-[10px] uppercase tracking-wider italic flex items-center justify-center gap-2"
        >
          <X size={14} /> Cancelar y regresar
        </Button>
      </div>
    </Alert>
  );
}
