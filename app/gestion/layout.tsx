// app/gestion/layout.tsx
"use client";
import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GestionSidebar } from "@/components/gestion/sidebar";
import { GestionHeader } from "@/components/gestion/header";
import { NowProvider } from "@/lib/now-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DemoGestion } from "@/components/demo/demo-gestion";
import { DemoRealtimeGate } from "@/components/demo/demo-realtime-gate";
import GestionLoading from "./loading";

const AuthModal = dynamic(() => import("@/components/auth-modal").then((m) => m.AuthModal), {
  ssr: false,
  loading: () => null,
});

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isHydrating, setIsAuthModalOpen } = useAuth();
  // En móvil/tablet el sidebar es un drawer: arranca cerrado. En escritorio (lg+) expandido.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches,
  );

  // Mientras AuthProvider restaura la sesión, pintar skeleton en vez del gate
  // "Ingresar PIN" (evita el flash ~1s en cada carga dura).
  if (isHydrating) {
    return <GestionLoading />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-sidebar border-sidebar-border shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Panel de Gestión</CardTitle>
            <CardDescription className="text-muted-foreground">Acceso exclusivo para personal autorizado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsAuthModalOpen(true)} className="w-full py-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold">
              Ingresar PIN de Acceso
            </Button>
          </CardContent>
        </Card>
        <AuthModal />
      </div>
    );
  }

  return (
    <NowProvider>
      <GestionContent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
        {children}
      </GestionContent>
    </NowProvider>
  );
}

function GestionContent({
  sidebarOpen,
  setSidebarOpen,
  children,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [setSidebarOpen]);

  return (
    <div className="min-h-screen bg-background flex">
      <DemoRealtimeGate />
      <a
        href="#gestion-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>
      <GestionSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col h-dvh transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20",
        )}
      >
        <GestionHeader onMenuToggle={toggleSidebar} />
        <main id="gestion-content" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      <AuthModal />
      <DemoGestion />
    </div>
  );
}
