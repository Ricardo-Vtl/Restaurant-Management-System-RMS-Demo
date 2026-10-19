import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder del shell completo. Solo se usa mientras AuthProvider restaura
 * la sesión, cuando todavía no se conoce el rol ni los ítems del sidebar.
 * El fallback de ruta NO debe usar este componente: Next lo anida debajo del
 * layout persistente y duplicaría sidebar/header.
 */
export function GestionShellSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-screen bg-background">
      <span className="sr-only">Cargando panel de gestión</span>
      <aside className="hidden h-screen w-64 shrink-0 flex-col gap-4 bg-navy p-4 lg:flex">
        <Skeleton className="size-10 rounded-full bg-navy-light/20" />
        <div className="flex flex-1 flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl bg-navy-light/20" />
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex h-16 items-center border-b border-border bg-card px-4">
          <Skeleton className="h-8 w-48" />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </header>
        <main className="flex w-full flex-col gap-6 p-4 md:p-6">
          <Skeleton className="h-8 w-56" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
