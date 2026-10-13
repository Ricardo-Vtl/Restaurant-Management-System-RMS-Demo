"use client";

import {
  MoreHorizontal,
  PackagePlus,
  PackageMinus,
  Trash2,
  ClipboardCheck,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Supply } from "@/lib/inventory";

export type SupplyAction = "in" | "out" | "waste" | "count" | "edit";

const META: Record<SupplyAction, { label: string; icon: typeof Pencil }> = {
  in: { label: "Registrar entrada", icon: PackagePlus },
  out: { label: "Registrar salida", icon: PackageMinus },
  waste: { label: "Registrar merma", icon: Trash2 },
  count: { label: "Conteo físico", icon: ClipboardCheck },
  edit: { label: "Editar insumo", icon: Pencil },
};

const MOVEMENTS: SupplyAction[] = ["in", "out", "waste"];

export function SupplyActionsMenu({
  supply,
  canManage,
  items = ["in", "out", "waste", "count", "edit"],
  onAction,
}: {
  supply: Supply;
  canManage: boolean;
  items?: SupplyAction[];
  onAction: (action: SupplyAction) => void;
}) {
  const movementItems = items.filter((a) => MOVEMENTS.includes(a));
  const manageItems = items.filter((a) => (a === "count" || a === "edit") && canManage);

  const renderItem = (action: SupplyAction) => {
    const { label, icon: Icon } = META[action];
    return (
      <DropdownMenuItem
        key={action}
        disabled={action !== "edit" && !supply.is_active}
        onSelect={() => onAction(action)}
      >
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 sm:size-9 text-muted-foreground hover:text-navy"
          aria-label={`Acciones de ${supply.name}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {movementItems.map(renderItem)}
        {movementItems.length > 0 && manageItems.length > 0 && <DropdownMenuSeparator />}
        {manageItems.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
