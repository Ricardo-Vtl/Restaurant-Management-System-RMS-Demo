"use client";

import { Armchair, Sliders, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import { can } from "@/lib/abilities";
import type { UserRole } from "@/lib/types";

interface PrevisualizacionMesa {
  mesa: number;
  sillas: number;
}

interface ConfiguracionLocalModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  hasOccupiedTables?: boolean;
  draftMesas: number;
  setDraftMesas: (mesas: number) => void;
  draftSillas: number;
  setDraftSillas: (sillas: number) => void;
  simSillasPorMesa: number;
  setSimSillasPorMesa: (sillas: number) => void;
  forzarRepartoTotal: boolean;
  setForzarRepartoTotal: (forzar: boolean) => void;
  previsualizacion: PrevisualizacionMesa[];
  respaldoSimulado: number;
  isConfigSaving: boolean;
  onSave: () => Promise<void>;
}

export function ConfiguracionLocalModal({
  isOpen,
  setIsOpen,
  hasOccupiedTables,
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
  onSave,
}: ConfiguracionLocalModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const role = useAuthStore(useShallow((s) => s.currentUser?.role)) as UserRole | undefined;
  if (!can(role, "tables:manage")) return null;

  const faltanSillas = forzarRepartoTotal
    ? Math.max(0, draftMesas - draftSillas)
    : Math.max(0, draftMesas * simSillasPorMesa - draftSillas);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open && hasOccupiedTables) {
          toast.warning("Cierra todas las mesas ocupadas antes de reconfigurar el local.");
          return;
        }
        setIsOpen(open);
      }}
    >
      <Tooltip>
        <DialogTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="border-gray-200 hover:bg-gray-50 rounded-xl gap-2 text-gray-700"
              disabled={hasOccupiedTables}
            >
              <Sliders size={16} /> Configurar Local
            </Button>
          </TooltipTrigger>
        </DialogTrigger>
        {hasOccupiedTables && (
          <TooltipContent side="bottom">Cierra las mesas ocupadas antes de reconfigurar</TooltipContent>
        )}
      </Tooltip>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy font-serif text-xl">
            <Armchair className="text-coral" /> Asistente de Inventario y Distribución
          </DialogTitle>
          <DialogDescription>
            Define el mobiliario total del local. El sistema calculará el respaldo sobrante de manera automática.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-3">
          <div className="grid gap-1.5">
            <Label htmlFor="g-mesas">Total Mesas en Local</Label>
            <Input
              id="g-mesas"
              type="number"
              min={1}
              max={99}
              step={1}
              value={draftMesas}
              onChange={(e) => setDraftMesas(Math.min(99, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-sillas">Total Sillas Disponibles</Label>
            <Input
              id="g-sillas"
              type="number"
              min={1}
              step={1}
              value={draftSillas}
              onChange={(e) => setDraftSillas(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-por-mesa">Sillas sugeridas por mesa</Label>
            <Input
              id="s-por-mesa"
              type="number"
              min={1}
              step={1}
              value={simSillasPorMesa}
              onChange={(e) => setSimSillasPorMesa(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            />
          </div>
          <div className="flex items-center justify-between border rounded-xl p-3 bg-gray-50 mt-5">
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs font-bold">Forzar reparto masivo</Label>
              <p className="text-[10px] text-muted-foreground">Distribuye excedentes en las mesas</p>
            </div>
            <Switch checked={forzarRepartoTotal} onCheckedChange={setForzarRepartoTotal} />
          </div>
        </div>

        <Card className="bg-navy/5 border-navy/10 p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 text-xs font-bold text-navy">
            <span>PREVISUALIZACIÓN DE LA SALA</span>
            {faltanSillas > 0 ? (
              <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-tight animate-pulse">
                Inventario insuficiente (Faltan {faltanSillas} sillas)
              </span>
            ) : (
              <span className="bg-coral text-white px-2 py-0.5 rounded text-[10px]">
                Sillas en Respaldo: {respaldoSimulado}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1 bg-white rounded-lg border text-[11px]">
            {previsualizacion.map((p) => (
              <div
                key={p.mesa}
                className={cn(
                  "p-2 border rounded-md text-center flex flex-col justify-center transition-colors",
                  p.sillas === 0 ? "bg-red-50/50 border-red-100 text-red-400" : "bg-gray-50 text-navy",
                )}
              >
                <span className="font-bold opacity-60">Mesa {p.mesa}</span>
                <span className="font-black text-sm">{p.sillas}</span>
              </div>
            ))}
          </div>
        </Card>

        <Button
          onClick={() => setShowConfirm(true)}
          className="w-full rounded-xl mt-2 bg-navy hover:bg-navy/90 text-white"
          disabled={isConfigSaving || faltanSillas > 0}
        >
          {isConfigSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check size={16} className="mr-2" />}
          Confirmar Distribucion e Inventario del Local
        </Button>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Reconfigurar el local?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion eliminara TODAS las mesas actuales y las recreara con la nueva distribucion.
                Las sillas se redistribuiran segun los parametros ingresados. Esta accion no se puede deshacer.
                {hasOccupiedTables && (
                  <span className="block mt-2 text-destructive font-bold">
                    Hay mesas ocupadas. No se recomienda continuar.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onSave} className="bg-navy hover:bg-navy/90">
                Confirmar y recrear mesas
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
