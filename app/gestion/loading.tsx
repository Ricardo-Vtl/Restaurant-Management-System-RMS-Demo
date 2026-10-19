import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion, ProductGridSkeleton, StatsSkeleton } from "@/components/gestion/skeletons";

/**
 * Fallback de ruta para /gestion y sus hijas. Next lo renderiza DENTRO del
 * layout persistente, por eso no incluye sidebar ni header propios.
 */
export default function GestionLoading() {
  return (
    <LoadingRegion label="Cargando módulo">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <StatsSkeleton count={4} />
        <ProductGridSkeleton count={6} />
      </div>
    </LoadingRegion>
  );
}
