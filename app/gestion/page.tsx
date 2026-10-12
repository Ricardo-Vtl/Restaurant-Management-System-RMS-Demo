"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/store";
import { useAllOrders } from "@/hooks/use-orders";
import { useMenuProducts } from "@/hooks/use-products";
import { useTables as useTablesQuery } from "@/hooks/use-tables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, AlertTriangle, ShoppingBag, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Empty, EmptyMedia, EmptyDescription } from "@/components/ui/empty";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";

export default function GestionDashboard() {
  const { currentUser } = useAuth();
  const { data: siteConfig } = useSiteConfig();
  const restaurantName = siteConfig?.name || FALLBACK_NAME;
  const { data: orders = [] } = useAllOrders();
  const { data: tables = [] } = useTablesQuery();
  const { data: allProducts = [] } = useMenuProducts();

  const stats = useMemo(() => {
    const ventasTotales = orders.filter((o) => o.status === "completed").reduce((acc, o) => acc + o.total, 0);
    const mesasOcupadas = tables.filter((t) => t.status === "occupied").length;
    const productosAgotados = allProducts.filter((p) => !p.available).length;
    const pedidosActivos = orders.filter((o) => o.status === "pending" || o.status === "preparing").length;
    return { ventasTotales, mesasOcupadas, productosAgotados, pedidosActivos };
  }, [orders, tables, allProducts]);

  const { ventasTotales, mesasOcupadas, productosAgotados, pedidosActivos } = stats;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header del Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy font-serif">Resumen General</h1>
          <p className="text-muted-foreground">
            Bienvenido, <span className="font-bold text-coral">{currentUser?.name}</span>. Aquí está lo que pasa hoy en{" "}
            {restaurantName}.
          </p>
        </div>
        <Badge variant="outline" className="w-fit px-4 py-1 border-coral/20 bg-coral/5 text-coral">
          <Clock className="size-3 mr-2" />
          Turno Activo
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas (Completadas)</CardTitle>
            <TrendingUp className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-navy">{formatCurrency(ventasTotales)}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="size-3 mr-1" />
              <span>"-"</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ocupación de Mesas</CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-navy">
              {mesasOcupadas} / {tables.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mesas con comensales ahora</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos en Cola</CardTitle>
            <ShoppingBag className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-navy">{pedidosActivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes por entregar</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-coral">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agotados</CardTitle>
            <AlertTriangle className="size-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-navy">{productosAgotados}</div>
            <p className="text-xs text-muted-foreground mt-1">Productos fuera de servicio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Lista de últimos pedidos */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="size-5 text-coral" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <Empty>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="size-6" />
                </EmptyMedia>
                <EmptyDescription>No hay órdenes registradas todavía.</EmptyDescription>
              </Empty>
            ) : (
              <div className="flex flex-col gap-4">
                {[...orders]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-black text-sm text-navy italic">Orden #{order.orderNumber}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                          {order.tableNumber ? `Mesa ${order.tableNumber}` : order.customerInfo?.name || "Mostrador"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-navy">${order.total.toFixed(2)}</p>
                        <Badge className="text-[10px] h-5 capitalize">{order.status}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-navy text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Estado del Comedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-xs font-black transition-colors",
                    t.status === "occupied"
                      ? "bg-coral text-accent-foreground"
                      : "bg-white/10 text-white/40 border border-white/5",
                  )}
                  title={`Mesa ${t.number} - ${t.status}`}
                >
                  {t.number}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <div className="size-2 bg-coral rounded-full" /> Ocupada
                </span>
                <span className="font-bold">{mesasOcupadas}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <div className="size-2 bg-white/20 rounded-full" /> Libre
                </span>
                <span className="font-bold">{tables.length - mesasOcupadas}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
