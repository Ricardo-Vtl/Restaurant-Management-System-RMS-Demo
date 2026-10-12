"use client";

import { LayoutGrid, Armchair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface MesasHeaderProps {
  totalLibres: number;
  totalOcupadas: number;
  sillasRespaldoActual: number;
}

export function MesasHeader({ totalLibres, totalOcupadas, sillasRespaldoActual }: MesasHeaderProps) {
  return (
    <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
      <div>
        <h1 className="text-3xl font-bold text-navy font-serif tracking-tight flex items-center gap-2">
          <LayoutGrid className="text-coral" /> Mapa de Mesas
        </h1>
        <p className="text-muted-foreground italic text-sm">Gestión de aforo y distribución inteligente de sillas</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Badge variant="success" className="gap-2 px-3 py-1.5 text-xs font-bold">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            {totalLibres} LIBRES
          </Badge>
          <Badge variant="outline" className="gap-2 px-3 py-1.5 text-xs font-bold border-coral/10 bg-coral/5 text-coral">
            <span className="size-2 rounded-full bg-coral animate-pulse" />
            {totalOcupadas} OCUPADAS
          </Badge>
          <Badge variant="outline" className="gap-2 px-3 py-1.5 text-xs font-bold border-navy/10 bg-navy/5 text-navy">
            <Armchair size={13} className="text-navy/70" />
            {sillasRespaldoActual} EN RESPALDO
          </Badge>
        </div>
      </div>
    </Card>
  );
}
