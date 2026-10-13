"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OrderViewToggleProps {
  view: "kanban" | "table";
  onViewChange: (view: "kanban" | "table") => void;
}

export function OrderViewToggle({ view, onViewChange }: OrderViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-2xl border border-border bg-white p-1 shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("kanban")}
        aria-pressed={view === "kanban"}
        className={cn(
          "rounded-xl px-3 py-2 text-xs sm:text-[10px] font-black uppercase italic",
          view === "kanban"
            ? "bg-navy text-white shadow-md"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        <LayoutGrid size={14} className="mr-1.5" aria-hidden="true" />
        Kanban
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("table")}
        aria-pressed={view === "table"}
        className={cn(
          "rounded-xl px-3 py-2 text-xs sm:text-[10px] font-black uppercase italic",
          view === "table"
            ? "bg-navy text-white shadow-md"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        <List size={14} className="mr-1.5" aria-hidden="true" />
        Tabla
      </Button>
    </div>
  );
}
