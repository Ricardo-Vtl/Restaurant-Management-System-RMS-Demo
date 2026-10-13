"use client";

import { useState, useMemo, useEffect } from "react";
import { Table } from "@/lib/types";
import { useTables } from "@/hooks/use-tables";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, MapPin, Trash2, Save, Loader2, Plus, Minus, AlertTriangle } from "lucide-react";
import { useGestionSillas } from "../../_hooks/useGestionSillas";

interface Props {
  mesa: Table;
  onCloseParentModal?: () => void;
  sillasRespaldoActual: number;
  poolTotalPrestable: number;
}

export const GestionTab = ({
  mesa: initialMesa,
  onCloseParentModal,
  sillasRespaldoActual,
  poolTotalPrestable,
}: Props) => {
  const { data: tables = [] } = useTables();

  const mesa = useMemo(() => {
    return tables.find((t) => t.id === initialMesa.id) || initialMesa;
  }, [tables, initialMesa]);

  const [guests, setGuests] = useState<number | null>(null);
  const [section, setSection] = useState(mesa.section || "");

  const { isSaving, save } = useGestionSillas({
    mesa,
    tables,
    sillasRespaldoActual,
    onCloseParentModal,
  });

  const isOccupied = mesa.status === "occupied";

  // 🟢 EFECTO DE SINCRONIZACIÓN ATÓMICA: Fuerza el estado local cada vez que cambia la mesa en el Store
  useEffect(() => {
    if (mesa) {
      // Usamos de forma estricta los comensales actuales, si es ocupada y está en null (error raro), aseguramos su capacity real
      const comensalesReales =
        mesa.currentGuests !== undefined && mesa.currentGuests !== null
          ? mesa.currentGuests
          : mesa.status === "occupied"
            ? mesa.capacity
            : 0;

      setGuests(comensalesReales);
      setSection(mesa.section || "");
    }
  }, [mesa.id, mesa.currentGuests, mesa.capacity, mesa.status, mesa.section]);

  // Límite dinámico basado en lo que la física real del local puede ofrecer
  const maxCapacidadPermitida = (mesa.capacity || 0) + poolTotalPrestable;

  // Loader de seguridad para evitar que el usuario interactúe antes de la sincronización de estados
  if (guests === null) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 bg-muted/50">
        <Loader2 className="animate-spin text-navy" size={24} />
        <p className="text-xs sm:text-[10px] font-black text-muted-foreground uppercase tracking-wider">
          Sincronizando Mobiliario...
        </p>
      </div>
    );
  }

  const handleAdjustGuests = (amount: number) => {
    setGuests((prev) => {
      if (prev === null) return 0;
      const newVal = prev + amount;
      if (newVal < 1) return 1;
      if (newVal > maxCapacidadPermitida) return maxCapacidadPermitida;
      return newVal;
    });
  };

  return (
    <div className="p-6 bg-muted/50 h-full overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- PANEL DE AJUSTE DE COMENSALES --- */}
        <Card className="gap-5 p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-coral" />
              <h3 className="text-xs font-black text-navy uppercase italic">Control de Flujo de Aforo</h3>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Ajustar Comensales en Servicio
              </Label>

              <div className="flex items-center justify-between bg-muted p-3 rounded-2xl border border-border">
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  className="size-10 rounded-full border-2 text-navy bg-white"
                  onClick={() => handleAdjustGuests(-1)}
                  disabled={guests <= 1 || isSaving}
                  aria-label="Reducir comensales"
                >
                  <Minus size={16} />
                </Button>

                <div className="text-center">
                  <span className="font-black italic text-3xl block text-navy">{guests}</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  className="size-10 rounded-full border-2 text-navy bg-white"
                  onClick={() => handleAdjustGuests(1)}
                  disabled={guests >= maxCapacidadPermitida || isSaving}
                  aria-label="Aumentar comensales"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="gestion-section"
                className="text-xs sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
              >
                Sección / Zona
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  id="gestion-section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  disabled={isSaving}
                  className="pl-9 bg-muted border-none font-black text-navy uppercase italic h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => save(guests, section)}
            disabled={isSaving}
            className="w-full bg-navy hover:bg-navy/90 text-white font-black text-xs sm:text-[10px] uppercase tracking-widest py-5 rounded-xl italic flex items-center justify-center gap-2 mt-4 shadow-md transition-transform active:scale-95"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Aplicar Cambios en Caliente
          </Button>
        </Card>

        {/* --- ZONA DE RIESGO DE GESTIÓN (PROTEGIDA) --- */}
        <Card className="p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-muted-foreground" />
              <h3 className="text-xs font-black text-muted-foreground uppercase italic">Estructura Física</h3>
            </div>

            {isOccupied ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800 mt-2">
                <AlertTriangle className="size-4 text-amber-600" />
                <AlertTitle className="text-amber-700">Mesa en Servicio Activo</AlertTitle>
                <AlertDescription className="text-amber-700/90">
                  No se puede eliminar ni alterar la estructura estructural de la mesa mientras tenga comensales
                  activos o una cuenta abierta en cocina.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-xs sm:text-[10px] font-bold text-muted-foreground uppercase leading-normal">
                Para eliminar o alterar drásticamente la capacidad de fábrica de esta mesa, por favor utilice el botón
                de eliminación directa ubicado en la vista de preparación antes de abrir el servicio.
              </p>
            )}
          </div>

          <Button
            variant="destructive"
            disabled
            className="w-full bg-muted text-muted-foreground font-black text-xs sm:text-[10px] uppercase tracking-widest py-5 rounded-xl italic flex items-center justify-center gap-2 opacity-50 cursor-not-allowed mt-4"
          >
            <Trash2 size={14} />
            Eliminar Mesa (Bloqueado)
          </Button>
        </Card>
      </div>
    </div>
  );
};
