"use client";

import { useState } from "react";
import { Loader2, Package, PackageMinus, PackagePlus, Trash2 } from "lucide-react";
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
import { SupplyActionsMenu, type SupplyAction } from "./supply-actions-menu";

type DialogState =
  | { kind: "form"; supply: Supply | null }
  | { kind: "movement"; supply: Supply; type: ManualMovementType }
  | { kind: "count"; supply: Supply }
  | null;

function minLabel(supply: Supply): string {
  return supply.stock_min > 0 ? `${formatQty(supply.stock_min)} ${supply.unit}` : "—";
}

export function SuppliesTab() {
  const { currentUser } = useAuth();
  const canManage = can(currentUser?.role, "inventory:manage");
  const { data: supplies = [], isLoading, error } = useSupplies();
  const updateSupply = useUpdateSupply();
  const [dialog, setDialog] = useState<DialogState>(null);

  const handleAction = (supply: Supply, action: SupplyAction) => {
    if (action === "edit") setDialog({ kind: "form", supply });
    else if (action === "count") setDialog({ kind: "count", supply });
    else setDialog({ kind: "movement", supply, type: action });
  };

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
        <div className="flex sm:justify-end">
          <Button
            onClick={() => setDialog({ kind: "form", supply: null })}
            className="w-full sm:w-auto h-11 sm:h-9 bg-coral hover:bg-coral/90"
          >
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
        <>
          {/* Escritorio — tabla */}
          <div className="hidden md:block rounded-xl border bg-card">
            <Table aria-label="Insumos">
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((supply) => (
                  <TableRow key={supply.id} className={!supply.is_active ? "opacity-50" : undefined}>
                    <TableCell className="font-medium text-navy">
                      {supply.name}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">{supply.unit}</span>
                    </TableCell>
                    <TableCell>
                      <StockLevel supply={supply} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{minLabel(supply)}</TableCell>
                    <TableCell>
                      <StatusControl
                        supply={supply}
                        canManage={canManage}
                        pending={updateSupply.isPending}
                        onToggle={handleToggleActive}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <SupplyActionsMenu supply={supply} canManage={canManage} onAction={(a) => handleAction(supply, a)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil — tarjetas */}
          <div className="flex flex-col gap-3 md:hidden">
            {supplies.map((supply) => (
              <SupplyCard
                key={supply.id}
                supply={supply}
                canManage={canManage}
                pending={updateSupply.isPending}
                onToggle={handleToggleActive}
                onAction={handleAction}
              />
            ))}
          </div>
        </>
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

function StatusControl({
  supply,
  canManage,
  pending,
  onToggle,
}: {
  supply: Supply;
  canManage: boolean;
  pending: boolean;
  onToggle: (supply: Supply) => void;
}) {
  if (!canManage) {
    return <span className="text-xs text-muted-foreground">{supply.is_active ? "Activo" : "Inactivo"}</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={supply.is_active}
        onCheckedChange={() => onToggle(supply)}
        disabled={pending}
        aria-label={supply.is_active ? `Archivar ${supply.name}` : `Reactivar ${supply.name}`}
      />
      <span className="text-xs text-muted-foreground">{supply.is_active ? "Activo" : "Inactivo"}</span>
    </div>
  );
}

function SupplyCard({
  supply,
  canManage,
  pending,
  onToggle,
  onAction,
}: {
  supply: Supply;
  canManage: boolean;
  pending: boolean;
  onToggle: (supply: Supply) => void;
  onAction: (supply: Supply, action: SupplyAction) => void;
}) {
  const disabled = !supply.is_active;
  return (
    <div className={cnCard(supply.is_active)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-navy truncate">{supply.name}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{supply.unit}</p>
        </div>
        <StatusControl supply={supply} canManage={canManage} pending={pending} onToggle={onToggle} />
      </div>

      <StockLevel supply={supply} />

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          Mín: <span className="font-bold text-navy">{minLabel(supply)}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-emerald-600 hover:bg-emerald-50"
            disabled={disabled}
            onClick={() => onAction(supply, "in")}
            aria-label={`Registrar entrada de ${supply.name}`}
          >
            <PackagePlus className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-blue-600 hover:bg-blue-50"
            disabled={disabled}
            onClick={() => onAction(supply, "out")}
            aria-label={`Registrar salida de ${supply.name}`}
          >
            <PackageMinus className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-destructive hover:bg-destructive/10"
            disabled={disabled}
            onClick={() => onAction(supply, "waste")}
            aria-label={`Registrar merma de ${supply.name}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
          <SupplyActionsMenu
            supply={supply}
            canManage={canManage}
            items={["count", "edit"]}
            onAction={(a) => onAction(supply, a)}
          />
        </div>
      </div>
    </div>
  );
}

function cnCard(active: boolean): string {
  return active
    ? "rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm"
    : "rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm opacity-60";
}
