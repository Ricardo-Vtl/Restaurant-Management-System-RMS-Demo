import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Contenedor accesible para estados de carga. */
export function LoadingRegion({
  label = "Cargando contenido",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

const STATS_GRID = {
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
} as const;

/** Réplica de las stats bars: scroll horizontal en móvil, grid en desktop. */
export function StatsSkeleton({
  count = 4,
  minWidth = "min-w-40",
  highlightedIndex = -1,
}: {
  count?: 3 | 4;
  minWidth?: string;
  highlightedIndex?: number;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:overflow-visible md:pb-0",
        STATS_GRID[count],
      )}
    >
      {Array.from({ length: count }).map((_, i) => {
        const highlighted = i === highlightedIndex;
        return (
          <div
            key={i}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-2xl p-3 shadow-sm md:min-w-0",
              minWidth,
              highlighted ? "bg-navy" : "border border-border bg-white",
            )}
          >
            <Skeleton className={cn("size-9 shrink-0 rounded-xl", highlighted && "bg-white/10")} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className={cn("h-2.5 w-16", highlighted && "bg-white/15")} />
              <Skeleton className={cn("h-4 w-14", highlighted && "bg-white/20")} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Cards de producto (Menú): imagen 4:3 + título + descripción + precio. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-1">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="size-9 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Cards de personal con avatar y chip de rol. */
export function StaffCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="size-9 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Cards de mesa h-44 (Mesas). */
export function TablesGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-44 w-full rounded-xl" />
      ))}
    </div>
  );
}

/** Cards de cuenta pendiente de cobro (Caja). */
export function AccountCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
          <div className="flex items-center justify-between border-t border-dashed pt-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Tabla desktop + cards móvil (Logística). */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 border-b border-border/40 px-4 py-4 last:border-0">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-40")} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </>
  );
}

function OrderTicketSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-3/4" />
      <div className="flex items-center justify-between border-t border-border/50 pt-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/** Kanban de Pedidos (3 columnas). */
export function KanbanSkeleton() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex justify-center py-2 md:hidden">
        <Skeleton className="h-2 w-24 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto snap-x snap-mandatory md:grid md:auto-rows-[minmax(0,1fr)] md:grid-cols-3 md:gap-4 md:overflow-visible md:snap-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex w-full shrink-0 snap-start snap-always flex-col overflow-hidden rounded-2xl border border-border bg-white md:w-auto"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-6 rounded-full" />
            </div>
            <div className="flex flex-col gap-2.5 p-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <OrderTicketSkeleton key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Paneles KDS: cola + preparación. */
export function KitchenSkeleton() {
  return (
    <div className="flex flex-1 gap-4 overflow-x-auto snap-x snap-mandatory lg:grid lg:grid-cols-2 lg:overflow-visible lg:snap-none">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex h-full w-full shrink-0 snap-start snap-always flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm lg:w-auto"
        >
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="size-6 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5 p-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <OrderTicketSkeleton key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dashboard: stats + actividad + estado del comedor. */
export function DashboardSkeleton() {
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex min-w-0 flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-4 rounded-2xl bg-navy p-6 shadow-sm">
          <Skeleton className="h-5 w-40 bg-white/15" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg bg-white/10" />
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <Skeleton className="h-3 w-full bg-white/15" />
            <Skeleton className="h-3 w-full bg-white/15" />
          </div>
        </div>
      </div>
  );
}

/** Config: status bar + tabs + card de formulario. */
export function ConfigSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-36 self-end rounded-xl" />
      </div>
    </div>
  );
}
