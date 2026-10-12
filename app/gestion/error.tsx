"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function GestionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md flex flex-col gap-6">
        <div className="size-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">🐟</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Error en el panel de gestión</h1>
        <p className="text-muted-foreground">Ocurrió un error inesperado. Por favor intenta de nuevo.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="px-6 py-3 bg-coral hover:bg-coral/90 rounded-xl">
            Reintentar
          </Button>
          <Button variant="secondary" onClick={() => router.push("/gestion")} className="px-6 py-3 rounded-xl">
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
