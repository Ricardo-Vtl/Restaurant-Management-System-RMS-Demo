"use client";

import { GlassWater, UtensilsCrossed, IceCream, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryItem {
  name: string;
  count: number;
}

interface CategoryRailProps {
  items: CategoryItem[];
  total: number;
  active: string;
  onSelect: (category: string) => void;
}

function iconFor(name: string) {
  const c = name.toLowerCase();
  if (c.includes("bebida")) return GlassWater;
  if (c.includes("postre")) return IceCream;
  return UtensilsCrossed;
}

export function CategoryRail({ items, total, active, onSelect }: CategoryRailProps) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-navy/5">
      <div
        role="group"
        aria-label="Filtrar por categoría"
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 md:justify-center"
      >
        <Pill
          active={active === "all"}
          onClick={() => onSelect("all")}
          icon={LayoutGrid}
          name="Todos"
          count={total}
        />
        {items.map((it) => (
          <Pill
            key={it.name}
            active={active === it.name}
            onClick={() => onSelect(it.name)}
            icon={iconFor(it.name)}
            name={it.name}
            count={it.count}
          />
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  icon: Icon,
  name,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UtensilsCrossed;
  name: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 px-4 h-11 sm:h-9 rounded-full text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all shrink-0",
        active ? "bg-navy text-white shadow-md" : "bg-muted text-navy hover:bg-muted/70",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {name}
      <span
        className={cn(
          "text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none",
          active ? "bg-white/20 text-white" : "bg-black/5 text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
