"use client";

import { Shield, UtensilsCrossed, ChefHat, Banknote, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { StaffMember } from "@/hooks/use-staff";
import type { UserRole } from "@/lib/types";
import { ROLE_LABELS } from "./staff-dialog";

const ROLE_META: Record<UserRole, { icon: typeof Shield; chip: string; ring: string }> = {
  admin: { icon: Shield, chip: "bg-coral/10 text-coral", ring: "ring-coral" },
  waiter: { icon: UtensilsCrossed, chip: "bg-blue-50 text-blue-700", ring: "ring-blue-500" },
  kitchen: { icon: ChefHat, chip: "bg-amber-50 text-amber-700", ring: "ring-amber-500" },
  cashier: { icon: Banknote, chip: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-500" },
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatAlta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

interface StaffCardProps {
  member: StaffMember;
  isSelf: boolean;
  pending: boolean;
  onEdit: (member: StaffMember) => void;
  onToggle: (member: StaffMember) => void;
}

export function StaffCard({ member, isSelf, pending, onEdit, onToggle }: StaffCardProps) {
  const meta = ROLE_META[member.role];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-4 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md",
        !member.is_active && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full bg-navy text-white font-black italic ring-2 ring-offset-2",
            meta.ring,
          )}
          aria-hidden="true"
        >
          {initialsOf(member.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-black text-navy truncate">{member.name}</p>
            {isSelf && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                Tú
              </span>
            )}
          </div>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
              meta.chip,
            )}
          >
            <Icon className="size-3" aria-hidden="true" />
            {ROLE_LABELS[member.role]}
          </span>
        </div>

        <div className="shrink-0 pt-1">
          {isSelf ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Activo
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {member.is_active ? "Activo" : "Inactivo"}
              </span>
              <Switch
                checked={member.is_active}
                onCheckedChange={() => onToggle(member)}
                disabled={pending}
                aria-label={member.is_active ? `Desactivar a ${member.name}` : `Reactivar a ${member.name}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">Alta: {formatAlta(member.created_at)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 sm:size-9 text-blue-600 hover:bg-blue-50"
          onClick={() => onEdit(member)}
          aria-label={`Editar a ${member.name}`}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
