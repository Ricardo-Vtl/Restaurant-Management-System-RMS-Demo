"use client";

import { Loader2, ShieldAlert, Store, Clock, Phone, ShoppingBag, Percent, Settings2 } from "lucide-react";
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
import { ConfigStatusBar } from "./_components/config-status-bar";

const TAB_TRIGGER_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-transparent px-4 h-11 sm:h-9 text-xs font-black uppercase tracking-wide shrink-0 data-[state=active]:border-coral data-[state=active]:bg-coral/10 data-[state=active]:text-coral";

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
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
          <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
            Configuración
          </h1>
        </div>
        <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
          Identidad, contacto, horarios, canales, impuestos y operación del POS
        </p>
      </div>

      <ConfigStatusBar config={config} />

      <Tabs defaultValue="identidad" className="w-full">
        <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto scrollbar-hide bg-transparent p-0 md:flex-wrap md:overflow-visible">
          <TabsTrigger value="identidad" className={TAB_TRIGGER_CLASS}>
            <Store className="size-4" aria-hidden="true" /> Identidad
          </TabsTrigger>
          <TabsTrigger value="horarios" className={TAB_TRIGGER_CLASS}>
            <Clock className="size-4" aria-hidden="true" /> Horarios
          </TabsTrigger>
          <TabsTrigger value="contacto" className={TAB_TRIGGER_CLASS}>
            <Phone className="size-4" aria-hidden="true" /> Contacto
          </TabsTrigger>
          <TabsTrigger value="canales" className={TAB_TRIGGER_CLASS}>
            <ShoppingBag className="size-4" aria-hidden="true" /> Canales
          </TabsTrigger>
          <TabsTrigger value="impuestos" className={TAB_TRIGGER_CLASS}>
            <Percent className="size-4" aria-hidden="true" /> Impuestos
          </TabsTrigger>
          <TabsTrigger value="operacion" className={TAB_TRIGGER_CLASS}>
            <Settings2 className="size-4" aria-hidden="true" /> Operación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identidad" className="mt-5">
          <IdentityTab config={config} />
        </TabsContent>
        <TabsContent value="horarios" className="mt-5">
          <ScheduleTab config={config} />
        </TabsContent>
        <TabsContent value="contacto" className="mt-5">
          <ContactTab config={config} />
        </TabsContent>
        <TabsContent value="canales" className="mt-5">
          <ChannelsTab config={config} />
        </TabsContent>
        <TabsContent value="impuestos" className="mt-5">
          <TaxTab config={config} />
        </TabsContent>
        <TabsContent value="operacion" className="mt-5">
          <OpsTab config={config} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
