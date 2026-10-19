"use client";

import { useState } from "react";
import { History } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  formatQty,
  MOVEMENT_TYPE_LABELS,
  type SupplyMovementType,
} from "@/lib/inventory";
import { useSupplies, useSupplyMovements } from "@/hooks/use-supplies";
import { LoadingRegion, TableSkeleton } from "@/components/gestion/skeletons";

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
  const { data: movements = [], isLoading, isFetching, error } = useSupplyMovements(supplyId === "all" ? undefined : supplyId);

  if (error) {
    return <p className="py-8 text-center text-destructive">Error al cargar los movimientos</p>;
  }

  return (
    <div className={cn("flex flex-col gap-4", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching && !isLoading}>
      <div className="flex sm:justify-end">
        <Select value={supplyId} onValueChange={setSupplyId}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Filtrar por insumo">
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
        <LoadingRegion label="Cargando movimientos">
          <TableSkeleton rows={7} columns={7} />
        </LoadingRegion>
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
        <>
          {/* Escritorio — tabla */}
          <div className="hidden md:block rounded-xl border bg-card">
            <Table aria-label="Movimientos de insumos">
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

          {/* Móvil — tarjetas */}
          <div className="flex flex-col gap-3 md:hidden">
            {movements.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={TYPE_BADGE[m.type]}>{MOVEMENT_TYPE_LABELS[m.type]}</Badge>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatMovementDate(m.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy truncate min-w-0">{m.supplies?.name ?? "—"}</span>
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums shrink-0",
                      m.quantity > 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {m.quantity > 0 ? "+" : "−"}
                    {formatQty(Math.abs(m.quantity))} {m.supplies?.unit ?? ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Queda <span className="font-mono font-semibold text-navy">{formatQty(m.stock_after)}</span>
                  </span>
                  <span className="truncate">{m.staff_users?.name ?? "Automático"}</span>
                </div>
                {m.reason && (
                  <p className="text-xs italic text-muted-foreground border-t border-border/50 pt-2">{m.reason}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
