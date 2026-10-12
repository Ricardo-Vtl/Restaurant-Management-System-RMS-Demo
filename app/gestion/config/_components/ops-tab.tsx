"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { opsSchema } from "@/lib/api-schemas";
import { useUpdateConfig, type FullConfig } from "../_hooks/use-config";
import { TabCard } from "./tab-card";

const opsFormSchema = z.object({ ops: opsSchema }).strict();
type OpsValues = z.infer<typeof opsFormSchema>;

export function OpsTab({ config }: { config: FullConfig }) {
  const update = useUpdateConfig();

  const defaults = useMemo<OpsValues>(
    () => ({
      ops: {
        sla_green_min: config.ops?.sla_green_min ?? 5,
        sla_yellow_min: config.ops?.sla_yellow_min ?? 15,
        caja_window_hours: config.ops?.caja_window_hours ?? 48,
      },
    }),
    [config],
  );

  const form = useForm<OpsValues>({
    resolver: zodResolver(opsFormSchema),
    values: defaults,
  });

  const green = useWatch({ control: form.control, name: "ops.sla_green_min" });
  const yellow = useWatch({ control: form.control, name: "ops.sla_yellow_min" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: config.id, updates: { ops: values.ops } });
      toast.success("Operación guardada");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  });

  return (
    <TabCard
      title="Operación del POS"
      description="Umbrales de tiempo en cocina y la ventana de cuentas visibles en Caja"
      onSave={onSubmit}
      isPending={update.isPending}
      isDirty={form.formState.isDirty}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3">
        <span className="text-sm text-muted-foreground">Así se verán los timers de cocina:</span>
        <Badge className="bg-success text-white">Verde &lt; {green ?? 0} min</Badge>
        <Badge className="bg-amber-500 text-white">Amarillo &lt; {yellow ?? 0} min</Badge>
        <Badge variant="destructive">Rojo ≥ {yellow ?? 0} min</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sla-green">Verde en cocina hasta (min)</Label>
          <Input
            id="sla-green"
            type="number"
            min={1}
            max={120}
            {...form.register("ops.sla_green_min", { valueAsNumber: true })}
          />
          {form.formState.errors.ops?.sla_green_min && (
            <p className="text-xs text-destructive">{form.formState.errors.ops.sla_green_min.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sla-yellow">Amarillo en cocina hasta (min)</Label>
          <Input
            id="sla-yellow"
            type="number"
            min={1}
            max={240}
            {...form.register("ops.sla_yellow_min", { valueAsNumber: true })}
          />
          {form.formState.errors.ops?.sla_yellow_min && (
            <p className="text-xs text-destructive">{form.formState.errors.ops.sla_yellow_min.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <Label htmlFor="caja-window">Ventana de cuentas en Caja (horas)</Label>
        <Input
          id="caja-window"
          type="number"
          min={1}
          max={720}
          {...form.register("ops.caja_window_hours", { valueAsNumber: true })}
        />
        {form.formState.errors.ops?.caja_window_hours && (
          <p className="text-xs text-destructive">{form.formState.errors.ops.caja_window_hours.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Las cuentas sin cobrar siguen visibles siempre; esta ventana solo limita el historial
          mostrado por defecto.
        </p>
      </div>
    </TabCard>
  );
}
