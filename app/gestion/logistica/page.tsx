"use client";

import { ShieldAlert } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/abilities";
import { useAuth } from "@/lib/store";
import { SuppliesTab } from "./_components/supplies-tab";
import { MovementsTab } from "./_components/movements-tab";
import { RecipesTab } from "./_components/recipes-tab";

const TAB_TRIGGER_CLASS =
  "rounded-full border border-transparent px-4 py-2 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral";

export default function LogisticaPage() {
  const { currentUser } = useAuth();

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-navy font-serif">Logística</h1>
        <p className="text-muted-foreground text-sm">
          Insumos, stock y movimientos — el consumo de cocina se descuenta solo por receta
        </p>
      </div>

      <Tabs defaultValue="insumos" className="w-full">
        <TabsList className="h-auto w-full max-w-3xl flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="insumos" className={TAB_TRIGGER_CLASS}>
            Insumos
          </TabsTrigger>
          <TabsTrigger value="movimientos" className={TAB_TRIGGER_CLASS}>
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="recetas" className={TAB_TRIGGER_CLASS}>
            Recetas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insumos" className="mt-6">
          <SuppliesTab />
        </TabsContent>
        <TabsContent value="movimientos" className="mt-6">
          <MovementsTab />
        </TabsContent>
        <TabsContent value="recetas" className="mt-6">
          <RecipesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
