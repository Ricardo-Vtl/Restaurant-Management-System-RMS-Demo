"use client";

import Link from "next/link";
import { useAuth } from "@/lib/store";
import { useAllOrders } from "@/hooks/use-orders";
import { useMenuProducts } from "@/hooks/use-products";
import { useTables as useTablesQuery } from "@/hooks/use-tables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Armchair, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Empty, EmptyMedia, EmptyDescription } from "@/components/ui/empty";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";
import { OrderStatusBadge } from "@/app/gestion/pedidos/_components/order-status-badge";
import { DashboardStats } from "./_components/dashboard-stats";
import { QuickActions } from "./_components/quick-actions";
import { DashboardSkeleton, LoadingRegion, StatsSkeleton } from "@/components/gestion/skeletons";

export default function GestionDashboard() {
  const { currentUser } = useAuth();
  const { data: siteConfig } = useSiteConfig();
  const restaurantName = siteConfig?.name || FALLBACK_NAME;
  const ordersQuery = useAllOrders();
  const tablesQuery = useTablesQuery();
  const productsQuery = useMenuProducts();
  const orders = ordersQuery.data ?? [];
  const tables = tablesQuery.data ?? [];
  const allProducts = productsQuery.data ?? [];
  const isLoading = ordersQuery.isLoading || tablesQuery.isLoading || productsQuery.isLoading;

  const mesasOcupadas = tables.filter((t) => t.status === "occupied").length;
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
              Resumen General
            </h1>
          </div>
          <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
            Bienvenido, <span className="text-coral">{currentUser?.name}</span> · {restaurantName}
          </p>
        </div>
        <Badge variant="outline" className="w-fit px-4 py-1 border-coral/20 bg-coral/5 text-coral">
          <Clock className="size-3 mr-2" aria-hidden="true" />
          Turno Activo
        </Badge>
      </div>

      {isLoading ? (
        <StatsSkeleton count={4} highlightedIndex={0} />
      ) : (
        <DashboardStats orders={orders} tables={tables} products={allProducts} />
      )}

      <QuickActions />

      {isLoading ? (
        <LoadingRegion label="Cargando resumen general">
          <DashboardSkeleton />
        </LoadingRegion>
      ) : (
        <div className="grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Actividad reciente */}
          <Card className="min-w-0 lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="size-5 text-coral" aria-hidden="true" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <Activity className="size-6" />
                  </EmptyMedia>
                  <EmptyDescription>No hay órdenes registradas todavía.</EmptyDescription>
                </Empty>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href="/gestion/pedidos"
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-sm text-navy italic">Orden #{order.orderNumber}</p>
                        <p className="text-xs sm:text-[10px] text-muted-foreground uppercase font-bold tracking-tight truncate">
                          {order.tableNumber ? `Mesa ${order.tableNumber}` : order.customerInfo?.name || "Mostrador"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-black text-sm text-navy">{formatCurrency(order.total)}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estado del comedor */}
          <Card className="min-w-0 shadow-sm bg-navy text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Armchair className="size-5 text-coral" aria-hidden="true" />
                Estado del Comedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tables.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/60">Aún no hay mesas configuradas.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {tables.map((t) => (
                      <div
                        key={t.id}
                        role="img"
                        aria-label={`Mesa ${t.number}: ${t.status === "occupied" ? "ocupada" : "libre"}`}
                        className={cn(
                          "aspect-square rounded-lg flex items-center justify-center text-xs font-black transition-colors",
                          t.status === "occupied"
                            ? "bg-coral text-accent-foreground"
                            : "bg-white/10 text-white/40 border border-white/5",
                        )}
                      >
                        {t.number}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-2 bg-coral rounded-full" aria-hidden="true" /> Ocupada
                      </span>
                      <span className="font-bold">{mesasOcupadas}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-2 bg-white/20 rounded-full" aria-hidden="true" /> Libre
                      </span>
                      <span className="font-bold">{tables.length - mesasOcupadas}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
