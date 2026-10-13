"use client";

import Link from "next/link";
import { Armchair, ClipboardList, ChefHat, Wallet, ChevronRight } from "lucide-react";

const ACTIONS = [
  { href: "/gestion/mesas", label: "Mesas", icon: Armchair, tint: "bg-blue-50 text-blue-600" },
  { href: "/gestion/pedidos", label: "Pedidos", icon: ClipboardList, tint: "bg-coral/10 text-coral" },
  { href: "/gestion/cocina", label: "Cocina", icon: ChefHat, tint: "bg-amber-50 text-amber-600" },
  { href: "/gestion/caja", label: "Caja", icon: Wallet, tint: "bg-emerald-50 text-emerald-600" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map(({ href, label, icon: Icon, tint }) => (
        <Link
          key={href}
          href={href}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-xs sm:text-sm font-black uppercase italic tracking-tight text-navy truncate">
            {label}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
