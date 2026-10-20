"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Plus, Store, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { configSchema, heroSlideSchema, brandColorsSchema } from "@/lib/api-schemas";
import { useUpdateConfig, useUploadAsset, type FullConfig } from "../_hooks/use-config";
import { TabCard } from "./tab-card";

const slideFormSchema = heroSlideSchema.extend({
  image_url: z
    .string()
    .min(1, "Sube una imagen para el slide")
    .url("La imagen del slide debe ser una URL válida")
    .max(500),
});

const identitySchema = configSchema
  .pick({ slogan: true, logo_url: true })
  .extend({
    name: z.string().min(1, "El nombre es obligatorio").max(80, "El nombre debe tener máximo 80 caracteres"),
    hero_slides: z.array(slideFormSchema).max(8, "El carrusel admite máximo 8 slides"),
    brand_colors: brandColorsSchema,
  })
  .strict();

type IdentityValues = z.infer<typeof identitySchema>;

const EMPTY_SLIDE = { image_url: "", title: "", subtitle: "", description: "" };

export function IdentityTab({ config }: { config: FullConfig }) {
  const update = useUpdateConfig();
  const upload = useUploadAsset();

  const defaults = useMemo<IdentityValues>(
    () => ({
      name: config.name ?? "",
      slogan: config.slogan ?? "",
      logo_url: config.logo_url ?? null,
      hero_slides: (config.hero_slides ?? []).map((s) => ({
        image_url: s.image_url ?? "",
        title: s.title ?? "",
        subtitle: s.subtitle ?? "",
        description: s.description ?? "",
      })),
      brand_colors: {
        primary: config.brand_colors?.primary ?? "#011c37",
        accent: config.brand_colors?.accent ?? "#d43a3a",
      },
    }),
    [config],
  );

  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    values: defaults,
  });
  const slides = useFieldArray({ control: form.control, name: "hero_slides" });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const slideInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const watchName = useWatch({ control: form.control, name: "name" });
  const watchSlogan = useWatch({ control: form.control, name: "slogan" });
  const watchLogo = useWatch({ control: form.control, name: "logo_url" });
  const watchSlides = useWatch({ control: form.control, name: "hero_slides" });
  const watchColors = useWatch({ control: form.control, name: "brand_colors" });

  const [previewSlide, setPreviewSlide] = useState(0);

  const slidesCount = watchSlides?.length ?? 0;
  const previewIndex = slidesCount > 0 ? Math.min(previewSlide, slidesCount - 1) : 0;
  const activeSlide = watchSlides?.[previewIndex];

  useEffect(() => {
    setPreviewSlide(0);
  }, [slidesCount]);

  const handleUpload = async (file: File | undefined, kind: "hero" | "logo", index?: number) => {
    if (!file) return;
    const maxBytes = kind === "hero" ? 3 * 1024 * 1024 : 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(kind === "hero" ? "La imagen no debe pesar más de 3 MB" : "El logo no debe pesar más de 1 MB");
      return;
    }
    try {
      const asset = await upload.mutateAsync({ file, kind });
      if (kind === "logo") {
        form.setValue("logo_url", asset.url, { shouldDirty: true, shouldValidate: true });
      } else if (index !== undefined) {
        form.setValue(`hero_slides.${index}.image_url`, asset.url, { shouldDirty: true, shouldValidate: true });
      }
      toast.success("Imagen subida — pulsa Guardar cambios para aplicar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: config.id,
        updates: {
          name: values.name,
          slogan: values.slogan,
          logo_url: values.logo_url || null,
          hero_slides: values.hero_slides,
          brand_colors: values.brand_colors,
        },
      });
      toast.success("Identidad guardada");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,26rem)]">
      <Form {...form}>
        <TabCard
          title="Identidad"
          description="Nombre, logo, colores de marca y las imágenes del carrusel principal"
          onSave={onSubmit}
          isPending={update.isPending}
          isDirty={form.formState.isDirty}
          icon={Store}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del restaurante</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre de tu restaurante" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slogan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lema</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Comida fresca, hecha al momento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div className="size-16 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {watchLogo ? (
                  <Image
                    src={watchLogo}
                    alt="Logo actual"
                    width={64}
                    height={64}
                    className="size-full object-contain"
                  />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={upload.isPending}>
                  {upload.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                  {watchLogo ? "Cambiar logo" : "Subir logo"}
                </Button>
                {watchLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => form.setValue("logo_url", null, { shouldDirty: true })}
                  >
                    <Trash2 className="size-4 mr-2" /> Quitar
                  </Button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  void handleUpload(e.target.files?.[0], "logo");
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG o WebP con transparencia · mínimo 64×64 px · máx. 1 MB</p>
          </div>

          {/* Colores */}
          <div className="grid gap-4 sm:grid-cols-2 xl:max-w-2xl">
            {(["primary", "accent"] as const).map((key) => (
              <FormField
                key={key}
                control={form.control}
                name={`brand_colors.${key}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{key === "primary" ? "Color principal" : "Color de acento"}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={field.value ?? "#000000"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="size-11 sm:size-9 rounded-md border cursor-pointer"
                          aria-label={key === "primary" ? "Selector de color principal" : "Selector de color de acento"}
                        />
                        <Input {...field} value={field.value ?? ""} placeholder="#011c37" className="font-mono" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          {/* Carrusel del hero */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Imágenes del carrusel</Label>
                <p className="text-xs text-muted-foreground">
                  1 imagen = fondo fijo · 2 o más = carrusel automático (máx. 8)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={slides.fields.length >= 8}
                onClick={() => slides.append({ ...EMPTY_SLIDE })}
              >
                <Plus className="size-4 mr-2" /> Añadir slide
              </Button>
            </div>

            {slides.fields.length === 0 && (
              <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
                Sin imágenes: el hero usará un fondo de color. Añade al menos una.
              </Card>
            )}

            {slides.fields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border bg-muted/30 sm:w-44">
                    {watchSlides?.[index]?.image_url ? (
                      <Image
                        src={watchSlides[index].image_url}
                        alt={watchSlides[index].title || `Slide ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 176px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="size-6" aria-hidden />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-muted-foreground mr-auto">
                        Slide {index + 1} de {slides.fields.length}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:size-8"
                        aria-label={`Subir slide ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => slides.move(index, index - 1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:size-8"
                        aria-label={`Bajar slide ${index + 1}`}
                        disabled={index === slides.fields.length - 1}
                        onClick={() => slides.move(index, index + 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:size-8 text-destructive"
                        aria-label={`Eliminar slide ${index + 1}`}
                        onClick={() => slides.remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={upload.isPending}
                        onClick={() => slideInputRefs.current[index]?.click()}
                      >
                        <Upload className="size-4 mr-2" />
                        {watchSlides?.[index]?.image_url ? "Cambiar imagen" : "Subir imagen"}
                      </Button>
                      <input
                        ref={(el) => {
                          slideInputRefs.current[index] = el;
                        }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          void handleUpload(e.target.files?.[0], "hero", index);
                          e.target.value = "";
                        }}
                      />
                      <span className="text-xs text-muted-foreground self-center">
                        Mín. 1200×675 px (16:9) · máx. 3 MB · JPG, PNG o WebP
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`hero_slides.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Título (ej. Bienvenidos)" aria-label={`Título del slide ${index + 1}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`hero_slides.${index}.subtitle`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Subtítulo (ej. Hecho en casa)" aria-label={`Subtítulo del slide ${index + 1}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`hero_slides.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Descripción corta" aria-label={`Descripción del slide ${index + 1}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabCard>
      </Form>

      {/* Preview en vivo */}
      <aside className="lg:sticky lg:top-6 h-fit">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Así se ve en la landing
        </p>
        <Card className="overflow-hidden">
          <div className="relative h-52" style={{ backgroundColor: watchColors?.primary ?? "#011c37" }}>
            {activeSlide?.image_url ? (
              <Image
                src={activeSlide.image_url}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="object-cover opacity-40"
              />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${watchColors?.primary ?? "#011c37"}66, ${watchColors?.primary ?? "#011c37"}cc)`,
              }}
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1.5 px-5 text-center">
              <div
                className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: watchColors?.accent ?? "#d43a3a" }}
              >
                Abierto Ahora
              </div>
              <p className="font-serif text-2xl font-bold text-white">
                {activeSlide?.title || watchName || "Tu restaurante"}
              </p>
              {activeSlide?.subtitle && (
                <p className="font-serif text-base" style={{ color: watchColors?.accent ?? "#d43a3a" }}>
                  {activeSlide.subtitle}
                </p>
              )}
              {activeSlide?.description && (
                <p className="text-xs text-white/75 max-w-[85%] leading-snug">{activeSlide.description}</p>
              )}
              {!activeSlide?.title && !activeSlide?.subtitle && (
                <p className="font-serif text-base text-white/85">{watchSlogan || "Tu lema aquí"}</p>
              )}
            </div>
          </div>
          <div
            className="flex items-center justify-between gap-2 px-4 py-1.5"
            style={{ backgroundColor: watchColors?.accent ?? "#d43a3a" }}
          >
            <span className="text-xs font-medium text-white">
              {slidesCount > 1
                ? `Slide ${previewIndex + 1} de ${slidesCount}`
                : slidesCount === 1
                  ? "1 imagen · fondo fijo"
                  : "Sin imágenes · fondo de color"}
            </span>
            {slidesCount > 1 && (
              <div className="flex items-center gap-1" role="group" aria-label="Elegir slide de la vista previa">
                {Array.from({ length: slidesCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPreviewSlide(i)}
                    aria-label={`Ver slide ${i + 1}`}
                    aria-current={i === previewIndex ? "true" : undefined}
                    className="group flex size-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  >
                    <span
                      className={`h-1.5 rounded-full transition-all ${
                        i === previewIndex ? "w-4 bg-white" : "w-1.5 bg-white/50 group-hover:bg-white/70"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">
          Los colores y el nombre se aplican al POS y a la landing al guardar.
        </p>
      </aside>
    </div>
  );
}
