"use client";

import { Armchair, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import { can } from "@/lib/abilities";
import type { UserRole } from "@/lib/types";

interface NuevaMesaModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  newMesa: { number: string; capacity: number };
  setNewMesa: (mesa: { number: string; capacity: number }) => void;
  isSaving: boolean;
  onSave: () => Promise<void>;
  sillasDisponibles: number;
  sillasRespaldo: number;
}

export function NuevaMesaModal({
  isOpen,
  setIsOpen,
  newMesa,
  setNewMesa,
  isSaving,
  onSave,
  sillasDisponibles,
  sillasRespaldo,
}: NuevaMesaModalProps) {
  const role = useAuthStore(useShallow((s) => s.currentUser?.role)) as UserRole | undefined;
  if (!can(role, "tables:manage")) return null;

  const base = Number(newMesa.capacity);
  const capacityReal = Math.min(base, sillasRespaldo);
  const pendientes = Math.max(0, base - capacityReal);
  const almacenPost = Math.max(0, sillasRespaldo - capacityReal);
  const hasError = base > 0 && base > sillasDisponibles;
  const cantSave = isSaving || !newMesa.number.trim() || base < 1 || hasError;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto h-11 sm:h-9 bg-navy hover:bg-navy/90 text-white rounded-xl gap-2 shadow-sm">
          <Plus size={18} /> Nueva Mesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy font-serif text-xl">
            <Armchair className="text-coral" size={20} /> Nueva Mesa
          </DialogTitle>
          <DialogDescription>Agrega una mesa al local usando las sillas disponibles del inventario.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="n-number">Número de Mesa</Label>
              <Input
                id="n-number"
                placeholder="No. de Mesa"
                value={newMesa.number}
                disabled={isSaving}
                onChange={(e) => setNewMesa({ ...newMesa, number: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="n-capacity">Sillas que tendrá</Label>
              <div className="relative">
                <Input
                  id="n-capacity"
                  type="number"
                  value={newMesa.capacity}
                  disabled={isSaving}
                  onChange={(e) => setNewMesa({ ...newMesa, capacity: Number(e.target.value) })}
                  min={1}
                  className="pr-16"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs sm:text-[11px] text-muted-foreground pointer-events-none tabular-nums">
                  / {sillasDisponibles}
                </span>
              </div>
            </div>
          </div>

          {hasError && (
            <p className="text-sm text-destructive !mt-1">
              Solo hay {sillasDisponibles} sillas disponibles para nuevas mesas
            </p>
          )}

          <Card className="bg-navy/5 border-navy/10 p-4 space-y-3">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">Distribución</span>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg border p-2.5 text-center">
                <p className="text-lg font-bold text-green-600 tabular-nums">{capacityReal}</p>
                <p className="text-xs sm:text-[10px] text-muted-foreground font-medium">Ahora</p>
              </div>
              <div className="bg-white rounded-lg border p-2.5 text-center">
                <p className="text-lg font-bold text-amber-600 tabular-nums">{pendientes}</p>
                <p className="text-xs sm:text-[10px] text-muted-foreground font-medium">Después</p>
              </div>
              <div className="bg-white rounded-lg border p-2.5 text-center">
                <p className="text-lg font-bold tabular-nums">{almacenPost}</p>
                <p className="text-xs sm:text-[10px] text-muted-foreground font-medium">Almacén</p>
              </div>
            </div>
          </Card>
        </div>

        <Button
          onClick={onSave}
          className="bg-coral hover:bg-coral/90 text-white w-full h-11 sm:h-9 rounded-xl"
          disabled={cantSave}
        >
          {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
          Crear Mesa
        </Button>
      </DialogContent>
    </Dialog>
  );
}
