"use client";

// Bienvenida de la demo: presentación breve + PINs + arranque del recorrido.
// Se muestra una sola vez por visitante (localStorage).

import { Boxes, Compass, Palette, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useDemoTour } from "./demo-tour-context";
import { TOUR_STEPS } from "./tour-steps";

const DEMO_PINS = [
  { role: "Admin", pin: "123456" },
  { role: "Mesero", pin: "111111" },
  { role: "Cocina", pin: "222222" },
  { role: "Caja", pin: "333333" },
];

const HIGHLIGHTS = [
  { icon: Wallet, label: "POS + KDS + Caja" },
  { icon: Boxes, label: "Inventario por recetas" },
  { icon: Palette, label: "White-label" },
];

export function WelcomeDialog() {
  const { mounted, state, start, skipWelcome } = useDemoTour();

  if (!mounted) return null;

  return (
    <Dialog
      open={!state.welcomeSeen}
      onOpenChange={(open) => {
        if (!open) skipWelcome();
      }}
    >
      <DialogContent className="max-w-md max-h-[92dvh] gap-0 overflow-y-auto p-0">
        <div className="bg-navy p-5 text-center sm:p-7">
          <div className="size-14 bg-coral rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-coral/20 sm:mb-4 sm:size-16">
            <Compass className="size-7 text-accent-foreground sm:size-8" aria-hidden="true" />
          </div>
          <DialogTitle className="font-serif text-2xl font-bold text-primary-foreground">
            Restaurant Manager
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/70 text-sm mt-1">
            Demo pública del sistema de gestión — datos de ejemplo, explora sin miedo
          </DialogDescription>
        </div>

        <div className="p-5 flex flex-col gap-4 sm:gap-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Punto de venta, mesas, cocina en vivo, caja, inventario por recetas y
            configuración white-label, en una sola aplicación. Te guío en {TOUR_STEPS.length} pasos o
            explora por tu cuenta.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <Badge key={label} variant="secondary" className="gap-1.5">
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </Badge>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              PINs de la demo
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PINS.map(({ role, pin }) => (
                <div
                  key={role}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2"
                >
                  <span className="text-sm font-medium">{role}</span>
                  <Kbd>{pin}</Kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={start} className="w-full h-12 text-base bg-coral hover:bg-coral/90">
              <Compass className="size-4 mr-2" aria-hidden="true" />
              Iniciar recorrido guiado
            </Button>
            <Button variant="ghost" onClick={skipWelcome} className="w-full text-muted-foreground">
              Explorar por mi cuenta
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Next.js 16 · Supabase · Tailwind v4 — código abierto en GitHub
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
