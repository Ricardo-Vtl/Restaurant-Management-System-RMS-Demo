"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Bell, Clock } from "lucide-react";
import { useAuth } from "@/lib/store";
import { useAllOrders } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OrderStatusBadge } from "@/app/gestion/pedidos/_components/order-status-badge";

const PENDING_STATUSES = ["pending", "confirmed", "preparing"];

interface HeaderProps {
  onMenuToggle: () => void;
}

function HeaderClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="size-4" aria-hidden="true" />
        <span className="text-sm">
          {currentTime.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <span className="text-sm text-muted-foreground capitalize">
        {currentTime.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </span>
    </div>
  );
}

export const GestionHeader = React.memo(function GestionHeader({ onMenuToggle }: HeaderProps) {
  const { currentUser } = useAuth();
  const { data: orders = [] } = useAllOrders();

  const { pendingOrders, preparingOrders, pendingList } = useMemo(() => {
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const preparingOrders = orders.filter((o) => o.status === "preparing").length;
    const pendingList = orders
      .filter((o) => PENDING_STATUSES.includes(o.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 12);
    return { pendingOrders, preparingOrders, pendingList };
  }, [orders]);

  const activeCount = pendingOrders + preparingOrders;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Center - Date/Time */}
      <HeaderClock />

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Quick Stats */}
        <div className="hidden sm:flex items-center gap-2">
          {pendingOrders > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
              {pendingOrders} pendiente{pendingOrders > 1 ? "s" : ""}
            </Badge>
          )}
          {preparingOrders > 0 && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
              {preparingOrders} en cocina
            </Badge>
          )}
        </div>

        {/* Pending orders popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Órdenes pendientes">
              <Bell className="size-5" aria-hidden="true" />
              {activeCount > 0 && (
                <Badge className="absolute -top-2 -right-2 size-5 bg-coral text-accent-foreground rounded-full p-0 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-xs font-black uppercase tracking-widest text-navy">Órdenes pendientes</span>
              <Badge variant="secondary" className="text-[10px] font-black">{pendingList.length}</Badge>
            </div>
            {pendingList.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin órdenes pendientes.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y divide-border/50">
                {pendingList.map((o) => (
                  <li key={o.id}>
                    <Link
                      href="/gestion/pedidos"
                      className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    >
                      <span className="min-w-0">
                        <span className="block font-black text-sm text-navy italic">#{o.orderNumber}</span>
                        <span className="block text-xs text-muted-foreground uppercase font-bold tracking-tight truncate">
                          {o.tableNumber ? `Mesa ${o.tableNumber}` : o.customerInfo?.name || "Mostrador"}
                        </span>
                      </span>
                      <OrderStatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t px-4 py-2">
              <Link
                href="/gestion/pedidos"
                className="block text-center text-xs font-black uppercase tracking-widest text-coral hover:underline"
              >
                Ver todos los pedidos
              </Link>
            </div>
          </PopoverContent>
        </Popover>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <Avatar className="size-8">
            <AvatarFallback className="bg-coral/10 text-coral font-bold text-sm">
              {currentUser?.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{currentUser?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
});
