"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Menu, Bell, Search, Clock } from "lucide-react";
import { useAuth } from "@/lib/store";
import { useAllOrders } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
        <Clock className="size-4" />
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

  const { pendingOrders, preparingOrders } = useMemo(() => {
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const preparingOrders = orders.filter((o) => o.status === "preparing").length;
    return { pendingOrders, preparingOrders };
  }, [orders]);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden" aria-label="Abrir menú de navegación">
          <Menu className="size-5" aria-hidden="true" />
        </Button>

        {/* Search - Desktop */}
        <div className="hidden lg:flex relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input aria-label="Buscar pedidos y mesas" placeholder="Buscar pedidos, mesas..." className="pl-9 bg-muted/50 border-0" />
        </div>
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

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="size-5" />
          {pendingOrders + preparingOrders > 0 && (
            <Badge className="absolute -top-2 -right-2 size-5 bg-coral text-accent-foreground rounded-full p-0 text-[10px]">
              {pendingOrders + preparingOrders}
            </Badge>
          )}
        </Button>

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
