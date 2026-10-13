"use client";

import { LayoutGrid } from "lucide-react";

export function MesasHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
        <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
          Mapa de Mesas
        </h1>
      </div>
      <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
        <LayoutGrid className="mr-1 inline size-3 align-[-1px]" aria-hidden="true" />
        Gestión de aforo y distribución inteligente de sillas
      </p>
    </div>
  );
}
