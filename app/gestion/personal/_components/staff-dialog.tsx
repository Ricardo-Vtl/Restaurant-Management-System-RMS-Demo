"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStaff, useUpdateStaff, type StaffMember } from "@/hooks/use-staff";
import type { UserRole } from "@/lib/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  waiter: "Mesero",
  kitchen: "Cocina",
  cashier: "Caja",
};

interface StaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingStaff: StaffMember | null;
  isSelf: boolean;
}

export function StaffDialog({ isOpen, onClose, editingStaff, isSelf }: StaffDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("waiter");
  const [pin, setPin] = useState("");

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const isPending = createStaff.isPending || updateStaff.isPending;

  useEffect(() => {
    if (isOpen) {
      setName(editingStaff?.name ?? "");
      setRole(editingStaff?.role ?? "waiter");
      setPin("");
    }
  }, [isOpen, editingStaff]);

  const pinValid = /^\d{6}$/.test(pin);
  const canSubmit =
    name.trim().length >= 2 && (editingStaff ? pin === "" || pinValid : pinValid) && !isPending;

  const handleSubmit = async () => {
    try {
      if (editingStaff) {
        await updateStaff.mutateAsync({
          id: editingStaff.id,
          updates: {
            ...(name.trim() !== editingStaff.name && { name: name.trim() }),
            ...(role !== editingStaff.role && { role }),
            ...(pin && { pin }),
          },
        });
        toast.success("Personal actualizado");
      } else {
        await createStaff.mutateAsync({ name: name.trim(), role, pin });
        toast.success(`${name.trim()} creado — ya puede entrar con su PIN`);
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
              {editingStaff ? (
                <Pencil className="size-5" aria-hidden="true" />
              ) : (
                <UserPlus className="size-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <DialogTitle>{editingStaff ? "Editar Personal" : "Nuevo Personal"}</DialogTitle>
              <DialogDescription>
                {editingStaff
                  ? "Actualiza nombre, rol o PIN. El PIN vacío se conserva."
                  : "El PIN de 6 dígitos es la credencial de acceso al POS."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-name">Nombre</Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoComplete="off"
              placeholder="Ej. María López"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-role">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isSelf}>
              <SelectTrigger id="staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">No puedes cambiar el rol de tu propia cuenta.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-pin">{editingStaff ? "Nuevo PIN (opcional)" : "PIN de acceso"}</Label>
            <Input
              id="staff-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="off"
              placeholder={editingStaff ? "Dejar vacío para no cambiar" : "6 dígitos"}
              className="tracking-[0.5em] font-mono"
            />
            {pin !== "" && !pinValid && (
              <p className="text-xs text-destructive">El PIN debe ser de 6 dígitos.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="h-11 sm:h-9">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-coral hover:bg-coral/90 h-11 sm:h-9">
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />}
            {editingStaff ? "Guardar cambios" : "Crear personal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
