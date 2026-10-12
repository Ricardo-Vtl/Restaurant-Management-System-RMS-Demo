"use client";

import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md flex flex-col gap-6">
        <div className="size-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">🐟</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
        <p className="text-muted-foreground">Hubo un error al cargar la página. Por favor intenta de nuevo.</p>
        <Button onClick={reset} className="px-6 py-3 bg-coral hover:bg-coral/90 rounded-xl">
          Intentar de Nuevo
        </Button>
      </div>
    </div>
  );
}
