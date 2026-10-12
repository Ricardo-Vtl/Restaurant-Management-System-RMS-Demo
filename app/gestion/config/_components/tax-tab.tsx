"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useUpdateConfig, type FullConfig } from "../_hooks/use-config";
import { TabCard } from "./tab-card";

const taxFormSchema = z
  .object({
    tax_enabled: z.boolean(),
    tax_rate: z.number().min(0, "La tasa debe ser mayor o igual a 0").max(1, "La tasa debe ser menor o igual a 1").nullable(),
    tax_label: z.string().max(20, "La etiqueta debe tener máximo 20 caracteres"),
    rfc: z.string().max(13, "El RFC debe tener máximo 13 caracteres"),
    razon_social: z.string().max(200, "La razón social debe tener máximo 200 caracteres"),
    ticket_footer: z.string().max(500, "El pie de ticket debe tener máximo 500 caracteres"),
  })
  .strict()
  .refine((v) => !v.tax_enabled || v.tax_rate != null, {
    message: "Define la tasa para activar los impuestos",
    path: ["tax_rate"],
  });

type TaxValues = z.infer<typeof taxFormSchema>;

export function TaxTab({ config }: { config: FullConfig }) {
  const update = useUpdateConfig();

  const defaults = useMemo<TaxValues>(
    () => ({
      tax_enabled: config.tax_enabled ?? false,
      tax_rate: config.tax_rate ?? null,
      tax_label: config.tax_label ?? "IVA",
      rfc: config.rfc ?? "",
      razon_social: config.razon_social ?? "",
      ticket_footer: config.ticket_footer ?? "",
    }),
    [config],
  );

  const form = useForm<TaxValues>({
    resolver: zodResolver(taxFormSchema),
    values: defaults,
  });

  const taxEnabled = useWatch({ control: form.control, name: "tax_enabled" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: config.id,
        updates: {
          tax_enabled: values.tax_enabled,
          tax_rate: values.tax_enabled ? values.tax_rate : null,
          tax_label: values.tax_label,
          rfc: values.rfc.trim() || null,
          razon_social: values.razon_social.trim() || null,
          ticket_footer: values.ticket_footer,
        },
      });
      toast.success("Impuestos guardados");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  });

  return (
    <Form {...form}>
      <TabCard
        title="Impuestos y ticket"
        description="Los precios del menú ya incluyen impuestos: al cobrar solo se desglosan"
        onSave={onSubmit}
        isPending={update.isPending}
        isDirty={form.formState.isDirty}
      >
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <Label htmlFor="tax-enabled" className="font-medium">
              Desglosar impuestos al cobrar
            </Label>
            <p className="text-xs text-muted-foreground">
              Muestra la línea de {form.watch("tax_label") || "IVA"} en el ticket sin recargar el total
            </p>
          </div>
          <Switch
            id="tax-enabled"
            checked={taxEnabled}
            onCheckedChange={(v) => form.setValue("tax_enabled", v, { shouldDirty: true })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tax_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tasa (0.16 = 16%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step="0.0001"
                    disabled={!taxEnabled}
                    placeholder="0.16"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tax_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etiqueta</FormLabel>
                <FormControl>
                  <Input {...field} disabled={!taxEnabled} placeholder="IVA" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="rfc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RFC</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="XAXX010101000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="razon_social"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razón social</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nombre fiscal del negocio" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ticket_footer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pie de ticket</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="¡Gracias por tu compra! Vuelve pronto."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabCard>
    </Form>
  );
}
