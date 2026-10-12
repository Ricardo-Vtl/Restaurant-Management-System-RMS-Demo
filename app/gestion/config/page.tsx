"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/abilities";
import { useAuth } from "@/lib/store";
import { useFullConfig } from "./_hooks/use-config";
import { IdentityTab } from "./_components/identity-tab";
import { ScheduleTab } from "./_components/schedule-tab";
import { ContactTab } from "./_components/contact-tab";
import { ChannelsTab } from "./_components/channels-tab";
import { TaxTab } from "./_components/tax-tab";
import { OpsTab } from "./_components/ops-tab";

export default function ConfigPage() {
  const { currentUser } = useAuth();
  const { data: config, isLoading, error } = useFullConfig();

  if (!can(currentUser?.role, "config:manage")) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Empty>
          <EmptyMedia variant="icon">
            <ShieldAlert className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Sin permisos</EmptyTitle>
            <EmptyDescription>
              La configuración del local solo está disponible para administradores
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Error al cargar la configuración</p>
      </div>
    );
  }

  if (isLoading || !config) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-coral" />
        <p className="text-muted-foreground animate-pulse">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-navy font-serif">Configuración</h1>
        <p className="text-muted-foreground text-sm">
          Identidad, contacto, horarios, canales de venta, impuestos y operación del POS
        </p>
      </div>

      <Tabs defaultValue="identidad" className="w-full">
        <TabsList className="h-auto w-full max-w-3xl flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger
            value="identidad"
            className="rounded-full border border-transparent px-4 py-2 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
          >
            Identidad
          </TabsTrigger>
          <TabsTrigger
            value="horarios"
            className="rounded-full border border-transparent px-4 py-2 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
          >
            Horarios
          </TabsTrigger>
          <TabsTrigger
            value="contacto"
            className="rounded-full border border-transparent px-4 py-2 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
          >
            Contacto
          </TabsTrigger>
          <TabsTrigger
            value="canales"
            className="rounded-full border border-transparent px-4 py-2 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
          >
            Canales
          </TabsTrigger>
          <TabsTrigger
            value="impuestos"
            className="rounded-full border border-transparent px-4 py-2 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
          >
            Impuestos
          </TabsTrigger>
          <TabsTrigger
            value="operacion"
            className="rounded-full border border-transparent px-4 py-2 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
          >
            Operación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identidad" className="mt-6">
          <IdentityTab config={config} />
        </TabsContent>
        <TabsContent value="horarios" className="mt-6">
          <ScheduleTab config={config} />
        </TabsContent>
        <TabsContent value="contacto" className="mt-6">
          <ContactTab config={config} />
        </TabsContent>
        <TabsContent value="canales" className="mt-6">
          <ChannelsTab config={config} />
        </TabsContent>
        <TabsContent value="impuestos" className="mt-6">
          <TaxTab config={config} />
        </TabsContent>
        <TabsContent value="operacion" className="mt-6">
          <OpsTab config={config} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
