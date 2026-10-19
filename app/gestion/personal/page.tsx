"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useStaff, useUpdateStaff, type StaffMember } from "@/hooks/use-staff";
import { useAuth } from "@/lib/store";
import { LoadingRegion, StaffCardsSkeleton, StatsSkeleton } from "@/components/gestion/skeletons";
import { StaffDialog } from "./_components/staff-dialog";
import { StaffStatsBar } from "./_components/staff-stats-bar";
import { StaffCard } from "./_components/staff-card";

export default function PersonalPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const { data: staff = [], isLoading, error } = useStaff();
  const updateStaff = useUpdateStaff();
  const { currentUser } = useAuth();

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await updateStaff.mutateAsync({ id: member.id, updates: { is_active: !member.is_active } });
      toast.success(member.is_active ? `${member.name} desactivado` : `${member.name} reactivado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  };

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Error al cargar el personal</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-7 w-1.5 bg-coral rounded-full" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-black text-navy uppercase italic tracking-tighter">
              Personal
            </h1>
          </div>
          <p className="text-xs sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest ml-[1.375rem]">
            Crea empleados, asigna roles y administra sus PIN de acceso
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingStaff(null);
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto h-11 sm:h-9 bg-coral hover:bg-coral/90 text-white font-black uppercase italic text-xs gap-2"
        >
          <Plus className="size-4" aria-hidden="true" /> Nuevo Personal
        </Button>
      </div>

      {isLoading ? (
        <LoadingRegion label="Cargando personal" className="flex flex-col gap-5">
          <StatsSkeleton count={4} minWidth="min-w-36" highlightedIndex={3} />
          <StaffCardsSkeleton />
        </LoadingRegion>
      ) : (
        <>
          {staff.length > 0 && <StaffStatsBar staff={staff} />}

        {staff.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <Users className="size-8" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No hay personal registrado</EmptyTitle>
              <EmptyDescription>
                Haz clic en &quot;Nuevo Personal&quot; para dar de alta al primer empleado.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {staff.map((member) => (
              <StaffCard
                key={member.id}
                member={member}
                isSelf={member.id === currentUser?.id}
                pending={updateStaff.isPending}
                onEdit={(m) => {
                  setEditingStaff(m);
                  setIsDialogOpen(true);
                }}
                onToggle={handleToggleActive}
              />
            ))}
          </div>
        )}
        </>
      )}

      <StaffDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        editingStaff={editingStaff}
        isSelf={editingStaff?.id === currentUser?.id}
      />
    </div>
  );
}
