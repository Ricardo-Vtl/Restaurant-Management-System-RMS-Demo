"use client";

import { useMemo } from "react";
import { Users, UserCheck, UserX, Shield } from "lucide-react";
import type { StaffMember } from "@/hooks/use-staff";

export function StaffStatsBar({ staff }: { staff: StaffMember[] }) {
  const stats = useMemo(
    () => ({
      equipo: staff.length,
      activos: staff.filter((s) => s.is_active).length,
      inactivos: staff.filter((s) => !s.is_active).length,
      admins: staff.filter((s) => s.role === "admin").length,
    }),
    [staff],
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
      <StatCard
        icon={<Users size={16} aria-hidden="true" />}
        label="Equipo"
        value={stats.equipo.toString()}
        accent="text-coral"
      />
      <StatCard
        icon={<UserCheck size={16} aria-hidden="true" />}
        label="Activos"
        value={stats.activos.toString()}
        accent="text-emerald-600"
      />
      <StatCard
        icon={<UserX size={16} aria-hidden="true" />}
        label="Inactivos"
        value={stats.inactivos.toString()}
        accent="text-muted-foreground"
      />
      <StatCard
        icon={<Shield size={16} aria-hidden="true" />}
        label="Admins"
        value={stats.admins.toString()}
        accent="bg-navy text-white rounded-xl"
        highlighted
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  highlighted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "shrink-0 min-w-36 md:min-w-0 rounded-2xl bg-navy p-3 shadow-sm flex items-center gap-3"
          : "shrink-0 min-w-36 md:min-w-0 rounded-2xl border border-border bg-white p-3 shadow-sm flex items-center gap-3"
      }
    >
      <div
        className={
          highlighted
            ? "flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white shrink-0"
            : "flex items-center justify-center w-9 h-9 rounded-xl bg-muted shrink-0 " + accent
        }
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className={
            highlighted
              ? "text-xs sm:text-[8px] font-bold uppercase tracking-widest text-white/60"
              : "text-xs sm:text-[8px] font-bold uppercase tracking-widest text-muted-foreground"
          }
        >
          {label}
        </span>
        <span
          className={
            highlighted
              ? "font-black text-white text-lg italic leading-tight truncate"
              : "font-black text-navy text-lg italic leading-tight truncate"
          }
        >
          {value}
        </span>
      </div>
    </div>
  );
}
