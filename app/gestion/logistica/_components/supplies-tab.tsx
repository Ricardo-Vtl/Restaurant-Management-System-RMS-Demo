"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Loader2,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can } from "@/lib/abilities";
import { useAuth } from "@/lib/store";
import { formatQty, type Supply } from "@/lib/inventory";
import { useSupplies, useUpdateSupply } from "@/hooks/use-supplies";
import { SupplyFormDialog } from "./supply-form-dialog";
import { MovementDialog, type ManualMovementType } from "./movement-dialog";
import { CountDialog } from "./count-dialog";
import { StockLevel } from "./stock-level";

type DialogState =
  | { kind: "form"; supply: Supply | null }
  | { kind: "movement"; supply: Supply; type: ManualMovementType }
  | { kind: "count"; supply: Supply }
  | null;

export function SuppliesTab() {
  const { currentUser } = useAuth();
  const canManage = can(currentUser?.role, "inventory:manage");
  const { data: supplies = [], isLoading, error } = useSupplies();
  const updateSupply = useUpdateSupply();
  const [dialog, setDialog] = useState<DialogState>(null);

  const handleToggleActive = async (supply: Supply) => {
    try {
      await updateSupply.mutateAsync({ id: supply.id, updates: { is_active: !supply.is_active } });
      toast.success(supply.is_active ? `${supply.name} archivado` : `${supply.name} reactivado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  };

  if (error) {
    return <p className="py-8 text-center text-destructive">Error al cargar los insumos</p>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-coral" aria-label="Cargando insumos" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setDialog({ kind: "form", supply: null })} className="bg-coral hover:bg-coral/90">
            <PackagePlus className="size-4 mr-2" aria-hidden="true" /> Nuevo insumo
          </Button>
        </div>
      )}

      {supplies.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <Package className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No hay insumos registrados</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? "Crea el primer insumo para empezar a controlar el stock."
                : "Pide a un administrador que registre los insumos."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplies.map((supply) => (
                <TableRow key={supply.id} className={!supply.is_active ? "opacity-50" : undefined}>
                  <TableCell className="font-medium text-navy">{supply.name}</TableCell>
                  <TableCell>
                    <StockLevel supply={supply} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {supply.stock_min > 0 ? `${formatQty(supply.stock_min)} ${supply.unit}` : "—"}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={supply.is_active}
                          onCheckedChange={() => handleToggleActive(supply)}
                          disabled={updateSupply.isPending}
                          aria-label={supply.is_active ? `Archivar ${supply.name}` : `Reactivar ${supply.name}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {supply.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {supply.is_active ? "Activo" : "Inactivo"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => setDialog({ kind: "movement", supply, type: "in" })}
                        disabled={!supply.is_active}
                        aria-label={`Registrar entrada de ${supply.name}`}
                        title="Entrada"
                      >
                        <PackagePlus className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-blue-600 hover:bg-blue-50"
                        onClick={() => setDialog({ kind: "movement", supply, type: "out" })}
                        disabled={!supply.is_active}
                        aria-label={`Registrar salida de ${supply.name}`}
                        title="Salida"
                      >
                        <PackageMinus className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDialog({ kind: "movement", supply, type: "waste" })}
                        disabled={!supply.is_active}
                        aria-label={`Registrar merma de ${supply.name}`}
                        title="Merma"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-navy hover:bg-navy/5"
                            onClick={() => setDialog({ kind: "count", supply })}
                            disabled={!supply.is_active}
                            aria-label={`Conteo físico de ${supply.name}`}
                            title="Conteo físico"
                          >
                            <ClipboardCheck className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-navy"
                            onClick={() => setDialog({ kind: "form", supply })}
                            aria-label={`Editar ${supply.name}`}
                            title="Editar"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplyFormDialog
        isOpen={dialog?.kind === "form"}
        onClose={() => setDialog(null)}
        editing={dialog?.kind === "form" ? dialog.supply : null}
      />
      <MovementDialog
        isOpen={dialog?.kind === "movement"}
        onClose={() => setDialog(null)}
        supply={dialog?.kind === "movement" ? dialog.supply : null}
        defaultType={dialog?.kind === "movement" ? dialog.type : "in"}
      />
      <CountDialog
        isOpen={dialog?.kind === "count"}
        onClose={() => setDialog(null)}
        supply={dialog?.kind === "count" ? dialog.supply : null}
      />
    </div>
  );
}
