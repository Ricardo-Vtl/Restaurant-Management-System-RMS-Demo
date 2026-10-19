"use client";

import { useEffect, useRef } from "react";
import { useKitchenOrders, useAcceptOrder, useMarkItemsReady } from "./_hooks/use-kitchen";
import { useOrderSound } from "@/lib/use-order-sound";
import { useSnapCarousel } from "@/lib/use-snap-carousel";
import { KitchenQueue } from "./_components/kitchen-queue";
import { KitchenActive } from "./_components/kitchen-active";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KitchenSkeleton, LoadingRegion } from "@/components/gestion/skeletons";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";

export default function CocinaPage() {
  const { queue, active, isLoading } = useKitchenOrders();
  const acceptOrder = useAcceptOrder();
  const markReady = useMarkItemsReady();
  const { soundEnabled, toggleSound } = useOrderSound();
  const { data: siteConfig } = useSiteConfig();
  const restaurantName = siteConfig?.name || FALLBACK_NAME;

  const { scrollerRef, active: activePanel, setActive, handleScroll, goTo } = useSnapCarousel(2);

  const activeCount = queue.length + active.length;

  useEffect(() => {
    document.title =
      activeCount > 0 ? `(${activeCount}) Cocina | ${restaurantName}` : `Cocina | ${restaurantName}`;
    return () => {
      document.title = `${restaurantName} POS`;
    };
  }, [activeCount, restaurantName]);

  // Si la cola está vacía al cargar, mostrar "En preparación" directamente.
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current || isLoading) return;
    initialised.current = true;
    if (queue.length === 0 && active.length > 0) {
      setActive(1);
      goTo(1, "auto");
    }
  }, [isLoading, queue.length, active.length, goTo, setActive]);

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
              Cocina — KDS
            </h1>
          </div>
          <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
            Gestion de comandas en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop: badges informativos (paneles lado a lado) */}
          {isLoading ? (
            <div className="hidden items-center gap-2 lg:flex">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ) : (
            <>
              <Badge variant="warning" className="hidden lg:inline-flex text-xs sm:text-[10px] font-black">
                {queue.length} cola
              </Badge>
              <Badge variant="info" className="hidden lg:inline-flex text-xs sm:text-[10px] font-black">
                {active.length} activas
              </Badge>
            </>
          )}

          {/* Móvil: pills que cambian de panel */}
          <div
            className="lg:hidden inline-flex items-center rounded-2xl border border-border bg-white p-1 shadow-sm"
            role="group"
            aria-label="Cambiar panel de cocina"
          >
            <PanelPill
              active={activePanel === 0}
              onClick={() => goTo(0)}
              label="Cola"
              count={queue.length}
              accent="amber"
              loading={isLoading}
            />
            <PanelPill
              active={activePanel === 1}
              onClick={() => goTo(1)}
              label="Preparación"
              count={active.length}
              accent="blue"
              loading={isLoading}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleSound}
            className="size-11 lg:size-9 rounded-xl"
            aria-label={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingRegion label="Cargando cocina" className="flex flex-1 min-h-0 flex-col">
          <KitchenSkeleton />
        </LoadingRegion>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          role="group"
          aria-label="Paneles de cocina"
          className="flex-1 min-h-0 flex lg:grid lg:grid-cols-2 lg:auto-rows-[minmax(0,1fr)] gap-4 overflow-x-auto lg:overflow-visible snap-x snap-mandatory lg:snap-none"
        >
          <div className="w-full shrink-0 snap-start snap-always lg:w-auto">
            <KitchenQueue orders={queue} onAccept={(orderId) => acceptOrder.mutate(orderId)} />
          </div>
          <div className="w-full shrink-0 snap-start snap-always lg:w-auto">
            <KitchenActive
              orders={active}
              onMarkItemsReady={(orderId, itemIds) => markReady.mutate({ orderId, itemIds })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PanelPill({
  active,
  onClick,
  label,
  count,
  accent,
  loading = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent: "amber" | "blue";
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-black uppercase italic transition-colors",
        active ? "bg-navy text-white shadow-md" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
      {loading ? (
        <Skeleton className="h-5 w-5 rounded-full" />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-xs sm:text-[10px] font-black",
            active
              ? "bg-white/20 text-white"
              : accent === "amber"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
