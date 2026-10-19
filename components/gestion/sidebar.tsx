"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  CreditCard,
  Settings,
  Truck,
  Users,
  BookOpen,
  LogOut,
  ChevronLeft,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/store";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ABILITIES, can } from "@/lib/abilities";
import { useLowStockCount } from "@/hooks/use-supplies";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: readonly UserRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/gestion", label: "Dashboard", icon: LayoutGrid, roles: ["admin", "waiter", "kitchen", "cashier"] },
  { href: "/gestion/mesas", label: "Mesas", icon: UtensilsCrossed, roles: ABILITIES["tables:operate"] },
  { href: "/gestion/pedidos", label: "Pedidos", icon: ClipboardList, roles: ["admin", "cashier", "kitchen", "waiter"] },
  { href: "/gestion/cocina", label: "Cocina (KDS)", icon: ChefHat, roles: ABILITIES["kds:view"] },
  { href: "/gestion/caja", label: "Caja", icon: CreditCard, roles: ABILITIES["orders:checkout"] },
  { href: "/gestion/menu", label: "Menú", icon: BookOpen, roles: ABILITIES["products:manage"] },
  { href: "/gestion/logistica", label: "Logística", icon: Truck, roles: ABILITIES["inventory:move"] },
  { href: "/gestion/personal", label: "Personal", icon: Users, roles: ABILITIES["staff:manage"] },
  { href: "/gestion/config", label: "Configuración", icon: Settings, roles: ABILITIES["config:manage"] },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const GestionSidebar = React.memo(function GestionSidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { count: lowStockCount, isLoading: lowStockLoading } = useLowStockCount(
    can(currentUser?.role, "inventory:move"),
  );
  const { data: siteConfig, isLoading: siteConfigLoading } = useSiteConfig();

  if (!currentUser) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(currentUser.role));

  // En móvil el sidebar es un drawer: al navegar hay que cerrarlo, o tapa el
  // contenido. En escritorio (lg) queda fijo y no se toca.
  const closeOnMobileNav = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) onToggle();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            aria-hidden="true"
            className="fixed inset-0 bg-navy/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isOpen ? 256 : 80,
          x: 0,
        }}
        className={cn(
          "fixed top-0 left-0 bottom-0 bg-navy z-50 flex flex-col",
          "transform transition-transform lg:translate-x-0",
          !isOpen && "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-navy-light/20">
          <Link
            href={isOpen ? "/" : "#"} // Cerrado: el click solo expande el sidebar (no navega)
            onClick={(e) => {
              if (!isOpen) {
                e.preventDefault();
                onToggle();
              }
            }}
            aria-label={!isOpen ? "Expandir menú" : undefined}
            title={!isOpen ? "Expandir menú" : undefined}
            className={cn(
              "flex items-center gap-3",
              !isOpen && "cursor-pointer hover:bg-navy-light/10 transition-colors", // Efecto hover sutil al estar cerrado
            )}
          >
            <div className="size-10 bg-coral rounded-full flex items-center justify-center shrink-0 overflow-hidden">
              {siteConfigLoading ? (
                <Skeleton className="size-10 rounded-full bg-white/20" />
              ) : siteConfig?.logo_url ? (
                <Image
                  src={siteConfig.logo_url}
                  alt={siteConfig.name || "Logo"}
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <UtensilsCrossed className="size-5 text-accent-foreground" />
              )}
            </div>
            <AnimatePresence>
              {isOpen &&
                (siteConfigLoading ? (
                  <Skeleton key="brand-skeleton" className="h-5 w-28 bg-white/15" />
                ) : (
                  <motion.span
                    key="brand-name"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-serif text-primary-foreground font-bold whitespace-nowrap overflow-hidden"
                  >
                    {siteConfig?.name || FALLBACK_NAME}
                  </motion.span>
                ))}
            </AnimatePresence>
          </Link>

          {/* Botón de alternancia — Se oculta limpiamente si está colapsado */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation(); // Evitamos que el clic active también el del contenedor principal
              onToggle();
            }}
            aria-label={isOpen ? "Colapsar menú lateral" : "Expandir menú lateral"}
            className={cn(
              "size-8 rounded-lg bg-navy-light/20 hover:bg-navy-light/30",
              isOpen ? "hidden lg:flex" : "hidden", // Oculto al cerrarse
            )}
          >
            <ChevronLeft
              className={cn("size-4 text-primary-foreground transition-transform", !isOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto" aria-label="Navegación principal">
          <ul className="flex flex-col gap-1 px-3">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/gestion" && pathname.startsWith(item.href));
              const badge =
                item.href === "/gestion/logistica" && lowStockCount > 0 ? String(lowStockCount) : item.badge;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeOnMobileNav}
                    aria-label={item.label}
                    title={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                      isActive
                        ? "bg-coral text-accent-foreground"
                        : "text-primary-foreground/70 hover:bg-navy-light/20 hover:text-primary-foreground",
                    )}
                  >
                    <item.icon className={cn("size-5 shrink-0", isActive && "text-accent-foreground")} aria-hidden="true" />
                    <AnimatePresence>
                      {isOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap overflow-hidden font-medium"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isOpen && item.href === "/gestion/logistica" && lowStockLoading ? (
                      <Skeleton className="ml-auto size-5 rounded-full bg-coral/20" />
                    ) : badge && isOpen ? (
                      <Badge variant="outline" className="ml-auto bg-coral/20 text-coral border-coral/20 rounded-full">
                        {badge}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <Separator className="border-navy-light/20" />
        <div className="p-4">
          <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
            <Avatar className="size-10">
              <AvatarFallback className="bg-coral/20 text-coral font-bold">{currentUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-primary-foreground font-medium text-sm truncate">{currentUser.name}</p>
                  <p className="text-primary-foreground/50 text-xs capitalize">{currentUser.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isOpen && (
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" asChild className="flex-1 justify-center gap-2 py-2 rounded-lg bg-navy-light/20 text-primary-foreground/70 hover:text-primary-foreground">
                <Link href="/" onClick={closeOnMobileNav}><Home className="size-4" /> Sitio</Link>
              </Button>
              <Button variant="ghost" onClick={async () => { await logout(); router.push("/"); }} className="flex-1 justify-center gap-2 py-2 rounded-lg bg-navy-light/20 text-primary-foreground/70 hover:text-destructive">
                <LogOut className="size-4" /> Salir
              </Button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
});
