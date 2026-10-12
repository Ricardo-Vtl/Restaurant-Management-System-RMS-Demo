"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useStaff, useUpdateStaff, type StaffMember } from "@/hooks/use-staff";
import { useAuth } from "@/lib/store";
import { StaffDialog, ROLE_LABELS } from "./_components/staff-dialog";

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

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-coral" />
        <p className="text-muted-foreground animate-pulse">Cargando personal...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy font-serif">Personal</h1>
          <p className="text-muted-foreground text-sm">Crea empleados, asigna roles y administra sus PIN de acceso</p>
        </div>
        <Button
          onClick={() => {
            setEditingStaff(null);
            setIsDialogOpen(true);
          }}
          className="bg-coral hover:bg-coral/90"
        >
          <Plus className="size-4 mr-2" /> Nuevo Personal
        </Button>
      </div>

      {staff.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <Users className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No hay personal registrado</EmptyTitle>
            <EmptyDescription>Haz clic en "Nuevo Personal" para dar de alta al primer empleado.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => {
                const isSelf = member.id === currentUser?.id;
                return (
                  <TableRow key={member.id} className={!member.is_active ? "opacity-50" : undefined}>
                    <TableCell className="font-medium text-navy">
                      {member.name}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={member.is_active}
                          onCheckedChange={() => handleToggleActive(member)}
                          disabled={isSelf || updateStaff.isPending}
                          aria-label={member.is_active ? `Desactivar a ${member.name}` : `Reactivar a ${member.name}`}
                        />
                        <span className="text-xs text-muted-foreground">{member.is_active ? "Activo" : "Inactivo"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar a ${member.name}`}
                        className="size-8 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setEditingStaff(member);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
