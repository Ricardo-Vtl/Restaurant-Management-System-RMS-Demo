"use client";

import { ShieldAlert, Package, History, BookOpen } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/abilities";
import { useAuth } from "@/lib/store";
import { useSupplies } from "@/hooks/use-supplies";
import { useActiveProducts } from "@/hooks/use-products";
import { SuppliesTab } from "./_components/supplies-tab";
import { MovementsTab } from "./_components/movements-tab";
import { RecipesTab } from "./_components/recipes-tab";
import { LogisticsStatsBar } from "./_components/logistics-stats-bar";

const TAB_TRIGGER_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-transparent px-4 h-11 sm:h-9 text-xs font-black uppercase tracking-wide data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral";

function Count({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-bold leading-none">{n}</span>
  );
}

export default function LogisticaPage() {
  const { currentUser } = useAuth();
  const { data: supplies = [] } = useSupplies();
  const { data: products = [] } = useActiveProducts();

  if (!can(currentUser?.role, "inventory:move")) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Empty>
          <EmptyMedia variant="icon">
            <ShieldAlert className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Sin permisos</EmptyTitle>
            <EmptyDescription>
              La logística de insumos está disponible para administradores, cocina y caja
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
          <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
            Logística
          </h1>
        </div>
        <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
          Insumos, stock y movimientos — el consumo de cocina se descuenta solo por receta
        </p>
      </div>

      <LogisticsStatsBar />

      <Tabs defaultValue="insumos" className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="insumos" className={TAB_TRIGGER_CLASS}>
            <Package className="size-4" aria-hidden="true" /> Insumos <Count n={supplies.length} />
          </TabsTrigger>
          <TabsTrigger value="movimientos" className={TAB_TRIGGER_CLASS}>
            <History className="size-4" aria-hidden="true" /> Movimientos
          </TabsTrigger>
          <TabsTrigger value="recetas" className={TAB_TRIGGER_CLASS}>
            <BookOpen className="size-4" aria-hidden="true" /> Recetas <Count n={products.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insumos" className="mt-5">
          <SuppliesTab />
        </TabsContent>
        <TabsContent value="movimientos" className="mt-5">
          <MovementsTab />
        </TabsContent>
        <TabsContent value="recetas" className="mt-5">
          <RecipesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
