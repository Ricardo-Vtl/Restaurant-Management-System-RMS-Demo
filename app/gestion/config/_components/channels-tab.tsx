"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bike, Store } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { channelsSchema } from "@/lib/api-schemas";
import { useUpdateConfig, type FullConfig } from "../_hooks/use-config";
import { TabCard } from "./tab-card";

const channelsFormSchema = z
  .object({
    web_orders_enabled: z.boolean(),
    channels: channelsSchema,
  })
  .strict();

type ChannelsValues = z.infer<typeof channelsFormSchema>;

const DEFAULT_CHANNEL = { enabled: true, eta_text: "", min_order: 0, fee: 0 };

export function ChannelsTab({ config }: { config: FullConfig }) {
  const update = useUpdateConfig();

  const defaults = useMemo<ChannelsValues>(
    () => ({
      web_orders_enabled: config.web_orders_enabled ?? true,
      channels: {
        delivery: {
          ...DEFAULT_CHANNEL,
          eta_text: "Entrega en 30-45 min",
          ...(config.channels?.delivery ?? {}),
        },
        pickup: {
          ...DEFAULT_CHANNEL,
          eta_text: "Listo en 20 min",
          ...(config.channels?.pickup ?? {}),
        },
      },
    }),
    [config],
  );

  const form = useForm<ChannelsValues>({
    resolver: zodResolver(channelsFormSchema),
    values: defaults,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: config.id,
        updates: {
          web_orders_enabled: values.web_orders_enabled,
          channels: values.channels,
        },
      });
      toast.success("Canales guardados");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  });

  return (
    <TabCard
      title="Canales de venta"
      description="Pedidos web, y reglas por canal: tiempo estimado, pedido mínimo y costo de envío"
      onSave={onSubmit}
      isPending={update.isPending}
      isDirty={form.formState.isDirty}
    >
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label htmlFor="web-orders" className="font-medium">
            Pedidos web activos
          </Label>
          <p className="text-xs text-muted-foreground">
            Apágalo para detener todo el pedido en línea sin tocar la carta
          </p>
        </div>
        <Switch
          id="web-orders"
          checked={form.watch("web_orders_enabled")}
          onCheckedChange={(v) => form.setValue("web_orders_enabled", v, { shouldDirty: true })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            { key: "delivery" as const, label: "Delivery", icon: Bike, feeEditable: true },
            { key: "pickup" as const, label: "Mostrador (pickup)", icon: Store, feeEditable: false },
          ]
        ).map(({ key, label, icon: Icon, feeEditable }) => {
          const enabled = form.watch(`channels.${key}.enabled`);
          return (
            <Card key={key} className={`p-4 flex flex-col gap-3 ${enabled ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-coral" aria-hidden />
                  <Label htmlFor={`${key}-enabled`} className="font-medium">
                    {label}
                  </Label>
                </div>
                <Switch
                  id={`${key}-enabled`}
                  checked={enabled}
                  onCheckedChange={(v) =>
                    form.setValue(`channels.${key}.enabled`, v, { shouldDirty: true })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${key}-eta`}>Tiempo estimado</Label>
                <Input
                  id={`${key}-eta`}
                  disabled={!enabled}
                  placeholder="Entrega en 30-45 min"
                  {...form.register(`channels.${key}.eta_text`)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${key}-min`}>Pedido mínimo ($)</Label>
                  <Input
                    id={`${key}-min`}
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!enabled}
                    {...form.register(`channels.${key}.min_order`, { valueAsNumber: true })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${key}-fee`}>Costo de envío ($)</Label>
                  <Input
                    id={`${key}-fee`}
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!enabled || !feeEditable}
                    {...form.register(`channels.${key}.fee`, { valueAsNumber: true })}
                  />
                </div>
              </div>
              {!feeEditable && (
                <p className="text-xs text-muted-foreground">El mostrador no tiene costo de envío.</p>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        El costo de envío se suma al total del pedido. El pedido mínimo se valida al confirmar el
        pedido en línea.
      </p>
    </TabCard>
  );
}
