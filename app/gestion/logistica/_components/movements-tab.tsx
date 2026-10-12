"use client";

import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  formatQty,
  MOVEMENT_TYPE_LABELS,
  type SupplyMovementType,
} from "@/lib/inventory";
import { useSupplies, useSupplyMovements } from "@/hooks/use-supplies";

const TYPE_BADGE: Record<SupplyMovementType, "success" | "info" | "warning" | "secondary"> = {
  in: "success",
  out: "info",
  waste: "warning",
  adjust: "secondary",
};

function formatMovementDate(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function MovementsTab() {
  const [supplyId, setSupplyId] = useState("all");
  const { data: supplies = [] } = useSupplies();
  const { data: movements = [], isLoading, error } = useSupplyMovements(supplyId === "all" ? undefined : supplyId);

  if (error) {
    return <p className="py-8 text-center text-destructive">Error al cargar los movimientos</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Select value={supplyId} onValueChange={setSupplyId}>
          <SelectTrigger className="w-64" aria-label="Filtrar por insumo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los insumos</SelectItem>
            {supplies.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-coral" aria-label="Cargando movimientos" />
        </div>
      ) : movements.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <History className="size-8" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Sin movimientos registrados</EmptyTitle>
            <EmptyDescription>
              Aquí aparece el libro de entradas, salidas, mermas, conteos y descuentos automáticos por venta.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Queda</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead>Registró</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatMovementDate(m.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-navy">{m.supplies?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={TYPE_BADGE[m.type]}>{MOVEMENT_TYPE_LABELS[m.type]}</Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${m.quantity > 0 ? "text-success" : "text-destructive"}`}
                  >
                    {m.quantity > 0 ? "+" : "−"}
                    {formatQty(Math.abs(m.quantity))} {m.supplies?.unit ?? ""}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatQty(m.stock_after)}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground" title={m.reason ?? undefined}>
                    {m.reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.staff_users?.name ?? "Automático"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
