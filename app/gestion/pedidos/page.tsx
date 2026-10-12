"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAllOrders } from "@/hooks/use-orders";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import { OrderViewToggle } from "./_components/order-view-toggle";
import { OrderStatsBar } from "./_components/order-stats-bar";
import { OrderKanban } from "./_components/order-kanban";
import { OrderTableView } from "./_components/order-table-view";
import { OrderDetailPanel } from "./_components/order-detail-panel";
import { useOrderSound } from "@/lib/use-order-sound";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/abilities";
import type { UserRole } from "@/lib/types";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";

const OrderCreateModal = dynamic(
  () => import("./_components/order-create-modal").then((m) => m.OrderCreateModal),
  { ssr: false, loading: () => null },
);

export default function PedidosPage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: orders = [], isLoading } = useAllOrders();
  const role = useAuthStore(useShallow((s) => s.currentUser?.role)) as UserRole | undefined;
  const { data: siteConfig } = useSiteConfig();
  const restaurantName = siteConfig?.name || FALLBACK_NAME;
  useOrderSound();

  const activeCount = orders.filter((o) =>
    ["pending", "confirmed", "preparing", "ready", "on-the-way"].includes(o.status),
  ).length;

  useEffect(() => {
    document.title =
      activeCount > 0 ? `(${activeCount}) Pedidos | ${restaurantName}` : `Pedidos | ${restaurantName}`;
    return () => {
      document.title = `${restaurantName} POS`;
    };
  }, [activeCount, restaurantName]);

  const canCreate = can(role, "orders:create");

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] gap-4 overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
              Logistica de Pedidos
            </h1>
          </div>
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
            Monitoreo en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-9 rounded-xl font-black uppercase italic text-[10px] gap-1.5"
            >
              <Plus size={14} />
              Nueva Orden
            </Button>
          )}
          <OrderViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="shrink-0">
        <OrderStatsBar orders={orders} />
      </div>

      <div className="relative shrink-0">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={14}
          aria-hidden="true"
        />
        <Input
          placeholder={view === "kanban" ? "Buscar pedido activo..." : "Buscar en historial..."}
          aria-label="Buscar pedidos"
          className="pl-10 h-10 bg-white border-border rounded-2xl text-xs font-medium focus-visible:ring-coral shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="rounded-2xl" />
          ))}
        </div>
      ) : view === "kanban" ? (
        <div className="flex-1 min-h-0">
          <OrderKanban orders={orders} search={search} onSelectOrder={setSelectedOrderId} />
        </div>
      ) : (
        <OrderTableView orders={orders} search={search} onSelectOrder={setSelectedOrderId} />
      )}

      <OrderDetailPanel
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />

      <OrderCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
