"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product } from "@/lib/types";
import { generateId } from "@/lib/uuid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Settings2, Info, PlusCircle, Flame, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { productSchema } from "@/lib/api-schemas";

const productFormSchema = productSchema.omit({ is_active: true });
type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct?: Product | null;
}

const defaultValues: ProductFormValues = {
  name: "",
  description: "",
  preparationTime: 15,
  basePrice: 0,
  category: "Aguachiles",
  image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
  available: true,
  hasSizes: false,
  sizes: [],
  hasSauces: false,
  sauces: [],
  hasExtras: false,
  extras: [],
  hasSpiceLevel: false,
  spiceLevels: [],
};

function mapEditingProduct(p: Product): ProductFormValues {
  return {
    name: p.name || "",
    category: p.category || "",
    basePrice: p.basePrice ?? 0,
    preparationTime: p.preparationTime ?? 15,
    description: p.description ?? "",
    image: p.image ?? "",
    available: p.available ?? true,
    hasSizes: p.hasSizes ?? false,
    sizes: p.sizes ?? [],
    hasSauces: p.hasSauces ?? false,
    sauces: p.sauces ?? [],
    hasSpiceLevel: p.hasSpiceLevel ?? false,
    spiceLevels: p.spiceLevels ?? [],
    hasExtras: p.hasExtras ?? false,
    extras: p.extras ?? [],
  };
}

const sections = [
  { id: "sizes" as const, label: "Opciones de Tamaño", key: "hasSizes" as const, icon: PlusCircle },
  { id: "sauces" as const, label: "Variedad de Salsas", key: "hasSauces" as const, icon: PlusCircle },
  { id: "spiceLevels" as const, label: "Niveles de Picor", key: "hasSpiceLevel" as const, icon: Flame },
  { id: "extras" as const, label: "Complementos y Extras", key: "hasExtras" as const, icon: PlusCircle },
];

export function ProductFormModal({ isOpen, onClose, editingProduct }: ProductFormModalProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const sizesField = useFieldArray({ control: form.control, name: "sizes" });
  const saucesField = useFieldArray({ control: form.control, name: "sauces" });
  const spiceLevelsField = useFieldArray({ control: form.control, name: "spiceLevels" });
  const extrasField = useFieldArray({ control: form.control, name: "extras" });

  const hasSizes = form.watch("hasSizes");
  const hasSauces = form.watch("hasSauces");
  const hasSpiceLevel = form.watch("hasSpiceLevel");
  const hasExtras = form.watch("hasExtras");
  const productName = form.watch("name");

  useEffect(() => {
    if (editingProduct) {
      form.reset(mapEditingProduct(editingProduct));
    } else if (isOpen) {
      form.reset(defaultValues);
    }
  }, [editingProduct, isOpen, form]);

  const fieldArrays = { sizes: sizesField, sauces: saucesField, spiceLevels: spiceLevelsField, extras: extrasField };
  const watchFlags = { hasSizes, hasSauces, hasSpiceLevel, hasExtras };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (editingProduct) {
        await apiFetch("/api/products", {
          method: "PATCH",
          body: JSON.stringify({
            filters: { id: editingProduct.id },
            updates: {
              ...values,
              preparationTime: Number(values.preparationTime) || 0,
            },
          }),
        });
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify({
            ...values,
            preparationTime: Number(values.preparationTime) || 0,
          }),
        });
      }

      toast.success(editingProduct ? "Platillo actualizado" : "Platillo publicado");
      onClose();
    } catch (error: unknown) {
      console.error("Error al guardar el producto:", error);
      toast.error("Error al guardar el producto");
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] xl:max-w-7xl h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-6 bg-[#1a1f2c] text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-coral rounded-xl">
              <Settings2 className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-serif">
                {editingProduct ? "Editar Platillo" : "Configurador de Producto"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">Gestiona la disponibilidad y personalización detallada</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 w-full bg-muted/50">
              <ScrollArea className="h-full w-full">
                <div className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* COLUMNA IZQUIERDA: Datos principales */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <Info className="size-4 text-coral" />
                        <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                          Datos Principales
                        </span>
                      </div>
                      <Separator className="mb-2" />

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Platillo *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="basePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Precio Base ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="preparationTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tiempo Prep. (min)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    className="pr-10"
                                    name={field.name}
                                    ref={field.ref}
                                    onBlur={field.onBlur}
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                  />
                                  <Clock className="size-4 absolute right-3 top-3 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea className="min-h-25" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL de la Imagen</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input placeholder="https://images.unsplash.com..." {...field} value={field.value ?? ""} />
                                {field.value && (
                                  <div className="size-10 rounded-lg overflow-hidden border shrink-0 relative">
                                    <Image
                                      src={field.value}
                                      alt={productName ? `Vista previa de ${productName}` : "Preview"}
                                      fill
                                      sizes="40px"
                                      className="object-cover"
                                      onError={(e) => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        target.src = "https://placehold.co/400?text=Error";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="available"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-dashed">
                              <FormLabel className="cursor-pointer font-medium">Disponible para la venta</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: Opciones Dinámicas */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    {sections.map((section) => {
                      const isActive = watchFlags[section.key];
                      const fArray = fieldArrays[section.id];

                      return (
                        <div
                          key={section.id}
                          className={cn(
                            "rounded-xl border bg-white p-4 transition-all",
                            isActive ? "border-coral ring-1 ring-coral/10" : "border-border",
                          )}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <section.icon className={cn("size-5", isActive ? "text-coral" : "text-muted-foreground")} />
                              <span className="text-lg font-bold">{section.label}</span>
                            </div>
                            <FormField
                              control={form.control}
                              name={section.key}
                              render={({ field }) => (
                                <FormControl>
                                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              )}
                            />
                          </div>

                          {isActive && (
                            <div className="flex flex-col gap-3">
                              {fArray.fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2">
                                  <Input
                                    placeholder="Nombre (ej: Mediano, Salsa Roja...)"
                                    aria-label={`Nombre de la opción ${index + 1}`}
                                    className="flex-1"
                                    {...form.register(`${section.id}.${index}.name` as const)}
                                  />
                                  {section.id !== "spiceLevels" && section.id !== "sauces" && (
                                    <Input
                                      type="number"
                                      className="w-24"
                                      placeholder="+$"
                                      aria-label={`Precio de la opción ${index + 1}`}
                                      {...form.register(`${section.id}.${index}.price` as const, { valueAsNumber: true })}
                                    />
                                  )}
                                  <Button variant="ghost" size="icon" aria-label={`Eliminar opción ${index + 1}`} onClick={() => fArray.remove(index)}>
                                    <Trash2 className="size-4 text-red-500" aria-hidden="true" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-dashed"
                                onClick={() =>
                                  fArray.append({ id: generateId(), name: "", price: 0 })
                                }
                              >
                                <Plus className="size-4 mr-2" /> Añadir Nueva Etiqueta
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </div>

            <Separator />
            <DialogFooter className="p-6 bg-white shrink-0 flex items-center justify-between">
              <p className="text-xs text-muted-foreground italic hidden sm:block">
                Los cambios se verán reflejados inmediatamente en el menú
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-coral hover:bg-coral/90 min-w-35 text-white" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : editingProduct ? (
                    "Guardar Cambios"
                  ) : (
                    "Publicar Platillo"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
