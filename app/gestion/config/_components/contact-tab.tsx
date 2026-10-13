"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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

// Los campos vacíos se normalizan en el submit (null/undefined): el form
// necesita strings para sus inputs controlados.
const urlOrEmpty = z.union([
  z.literal(""),
  z.string().url("Debe ser una URL válida").max(300, "La URL debe tener máximo 300 caracteres"),
]);

const contactSchema = z
  .object({
    phone: z.string().max(30, "El teléfono debe tener máximo 30 caracteres"),
    whatsapp_number: z.union([
      z.literal(""),
      z.string().regex(/^\d{10,15}$/, "Solo dígitos con lada (10-15), ej. 521234567890"),
    ]),
    address: z.string().max(200, "La dirección debe tener máximo 200 caracteres"),
    maps_embed_url: z.union([
      z.literal(""),
      z.string().url("La URL del mapa debe ser válida").max(2000, "La URL es demasiado larga"),
    ]),
    socials: z.object({
      facebook: urlOrEmpty,
      instagram: urlOrEmpty,
      tiktok: urlOrEmpty,
    }),
  })
  .strict();

type ContactValues = z.infer<typeof contactSchema>;

export function ContactTab({ config }: { config: FullConfig }) {
  const update = useUpdateConfig();

  const defaults = useMemo<ContactValues>(
    () => ({
      phone: config.phone ?? "",
      whatsapp_number: config.whatsapp_number ?? "",
      address: config.address ?? "",
      maps_embed_url: config.maps_embed_url ?? "",
      socials: {
        facebook: config.socials?.facebook ?? "",
        instagram: config.socials?.instagram ?? "",
        tiktok: config.socials?.tiktok ?? "",
      },
    }),
    [config],
  );

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    values: defaults,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const socials = {
      ...(values.socials.facebook.trim() ? { facebook: values.socials.facebook.trim() } : {}),
      ...(values.socials.instagram.trim() ? { instagram: values.socials.instagram.trim() } : {}),
      ...(values.socials.tiktok.trim() ? { tiktok: values.socials.tiktok.trim() } : {}),
    };

    try {
      await update.mutateAsync({
        id: config.id,
        updates: {
          phone: values.phone.trim(),
          whatsapp_number: values.whatsapp_number.trim() || null,
          address: values.address.trim(),
          maps_embed_url: values.maps_embed_url.trim() || null,
          socials,
        },
      });
      toast.success("Contacto guardado");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  });

  return (
    <Form {...form}>
      <TabCard
        title="Contacto y redes"
        description="Cómo te encuentran y contactan tus clientes: teléfono, WhatsApp, dirección, mapa y redes sociales"
        onSave={onSubmit}
        isPending={update.isPending}
        isDirty={form.formState.isDirty}
        icon={Phone}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" placeholder="+52 55 1234 5678" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whatsapp_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" placeholder="521234567890" />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Solo dígitos con lada (10-15). Se usa para el botón de WhatsApp de la landing.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Av. Principal 123, Col. Centro, Ciudad de México" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maps_embed_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL del mapa (embed)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://www.google.com/maps/embed?pb=..." />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                En Google Maps: Compartir → Insertar un mapa → copia la URL del atributo{" "}
                <code className="font-mono">src</code> del iframe. Si se deja vacío, la sección de
                ubicación no se muestra.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="socials.facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://facebook.com/tu-restaurante" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="socials.instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://instagram.com/tu-restaurante" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="socials.tiktok"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TikTok</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://tiktok.com/@tu-restaurante" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Las redes solo se muestran en la landing cuando tienen URL configurada.
        </p>
      </TabCard>
    </Form>
  );
}
