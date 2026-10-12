"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md flex flex-col gap-6">
        <div className="size-20 bg-muted/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">🐟</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Página no encontrada</h1>
        <p className="text-muted-foreground">La página que buscas no existe o ha sido movida.</p>
        <Button asChild className="px-6 py-3 bg-coral hover:bg-coral/90 rounded-xl">
          <Link href="/">Volver al inicio</Link>
        </Button>
        <Link href="/gestion" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
          Ir al panel de gestión
        </Link>
      </div>
    </div>
  );
}
