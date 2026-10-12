"use client";

import { useEffect } from "react";
import { useKitchenOrders, useAcceptOrder, useMarkItemsReady } from "./_hooks/use-kitchen";
import { useOrderSound } from "@/lib/use-order-sound";
import { KitchenQueue } from "./_components/kitchen-queue";
import { KitchenActive } from "./_components/kitchen-active";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, Volume2, VolumeX } from "lucide-react";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";

export default function CocinaPage() {
  const { queue, active, isLoading } = useKitchenOrders();
  const acceptOrder = useAcceptOrder();
  const markReady = useMarkItemsReady();
  const { soundEnabled, toggleSound } = useOrderSound();
  const { data: siteConfig } = useSiteConfig();
  const restaurantName = siteConfig?.name || FALLBACK_NAME;

  const activeCount = queue.length + active.length;

  useEffect(() => {
    document.title =
      activeCount > 0 ? `(${activeCount}) Cocina | ${restaurantName}` : `Cocina | ${restaurantName}`;
    return () => {
      document.title = `${restaurantName} POS`;
    };
  }, [activeCount, restaurantName]);

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
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
            Gestion de comandas en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-[10px] font-black">
            {queue.length} cola
          </Badge>
          <Badge variant="info" className="text-[10px] font-black">
            {active.length} activas
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSound}
            className="size-9 rounded-xl"
            aria-label={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          <Skeleton className="rounded-2xl" />
          <Skeleton className="rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          <KitchenQueue
            orders={queue}
            onAccept={(orderId) => acceptOrder.mutate(orderId)}
          />
          <KitchenActive
            orders={active}
            onMarkItemsReady={(orderId, itemIds) => markReady.mutate({ orderId, itemIds })}
          />
        </div>
      )}
    </div>
  );
}
