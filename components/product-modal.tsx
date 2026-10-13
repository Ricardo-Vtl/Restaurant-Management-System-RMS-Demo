"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Minus, Plus, Flame, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCart } from "@/lib/store";
import type { Product, ProductSize, ProductSauce, ProductExtra, OrderItemModifiers } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { computeItemPrice } from "@/lib/pricing";
import { placeholderImage } from "@/lib/placeholder-images";

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  /** * Callback opcional para el flujo de Mesas/POS.
   * Se usa el nombre 'onAddToCart' para coincidir con la llamada en MenuTab.tsx
   * y resolver los errores de TypeScript.
   */
  onAddToCart?: (product: Product, modifiers: OrderItemModifiers, quantity: number) => void;
  /** Etiqueta del botón de agregar con onAddToCart (p. ej. "Añadir al Pedido" en el wizard walk-in) */
  addLabel?: string;
}

export function ProductModal({ product, isOpen, onClose, onAddToCart, addLabel }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(undefined);
  const [selectedSauce, setSelectedSauce] = useState<ProductSauce | undefined>(undefined);
  const [spiceLevel, setSpiceLevel] = useState<string | undefined>(undefined);
  const [selectedExtras, setSelectedExtras] = useState<Map<string, ProductExtra>>(new Map());
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const addTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { addToCart, setIsCartOpen } = useCart();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedSize(product.hasSizes ? product.sizes?.[0] : undefined);
      setSelectedSauce(product.sauces?.[0]);

      if (product.hasSpiceLevel && product.spiceLevels && product.spiceLevels.length > 0) {
        setSpiceLevel(product.spiceLevels[0].name);
      } else {
        setSpiceLevel(undefined);
      }

      setSelectedExtras(new Map());
      setSpecialInstructions("");
    }
  }, [isOpen, product]);

  // Bloqueo de scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      clearTimeout(addTimerRef.current);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!product) return null;

  const isFormValid = (): boolean => {
    if (!product) return false;
    if (product.hasSizes && !selectedSize) return false;
    if (product.hasSauces && !selectedSauce) return false;
    if (product.hasSpiceLevel && !spiceLevel) return false;
    return true;
  };

  const calculatePrice = (): number => {
    if (!product) return 0;
    return (
      computeItemPrice(product, {
        size: selectedSize,
        sauce: selectedSauce,
        extras: Array.from(selectedExtras.values()),
      }) * quantity
    );
  };

  const handleAddToCart = () => {
    if (!isFormValid()) return;
    setIsAdding(true);

    const modifiers: OrderItemModifiers = {
      size: selectedSize,
      sauce: selectedSauce,
      spiceLevel: spiceLevel || "",
      extras: Array.from(selectedExtras.values()),
      specialInstructions,
    };

    if (onAddToCart) {
      onAddToCart(product, modifiers, quantity);
    } else {
      addToCart(product, modifiers, quantity);
    }

    addTimerRef.current = setTimeout(() => {
      setIsAdding(false);
      onClose();
      if (!onAddToCart) setIsCartOpen(true);
    }, 500);
  };

  const toggleExtra = (extra: ProductExtra) => {
    setSelectedExtras((prev) => {
      const next = new Map(prev);
      if (next.has(extra.id)) {
        next.delete(extra.id);
      } else {
        next.set(extra.id, extra);
      }
      return next;
    });
  };

  const totalPrice = calculatePrice();
  const formIsValid = isFormValid();
  const imageSrc = product.image || placeholderImage;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden max-h-[90dvh] flex flex-col"
        showCloseButton={false}
      >
        {/* Header con imagen */}
        <div className="relative aspect-video w-full bg-muted shrink-0">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 512px"
          />
          {!product.available && (
            <div className="absolute inset-0 bg-navy/80 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">No Disponible</span>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 size-10 bg-card/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-card transition-colors z-10"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <div className="absolute bottom-4 left-4 bg-coral text-accent-foreground px-4 py-2 rounded-full font-bold shadow-lg">
            ${product.hasSizes && selectedSize ? selectedSize.price : product.basePrice}
          </div>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <DialogTitle className="font-serif text-xl sm:text-2xl font-bold text-card-foreground mb-2">{product.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground mb-6">{product.description}</DialogDescription>

          {/* Tamaños */}
          {product.hasSizes && product.sizes && product.sizes.length > 0 && (
            <div className="mb-6">
              <Label className="font-medium text-card-foreground mb-3 block">
                Tamaño <span className="text-coral">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={selectedSize?.id === size.id}
                    className={cn(
                      "py-3 px-4 rounded-xl border-2 transition-all relative flex flex-col items-center",
                      selectedSize?.id === size.id
                        ? "border-coral bg-coral/10"
                        : "border-border hover:border-coral/50",
                    )}
                  >
                    <span className="font-medium block">{size.name}</span>
                    {size.price > 0 && (
                      <span className="text-xs text-coral">{size.price > 0 ? formatCurrency(size.price) : "Incluido"}</span>
                    )}
                    {selectedSize?.id === size.id && (
                      <Check className="absolute top-2 right-2 size-4 text-coral" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Salsas */}
          {product.hasSauces && product.sauces && product.sauces.length > 0 && (
            <div className="mb-6">
              <Label className="font-medium text-card-foreground mb-3 block">
                Salsa <span className="text-coral">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {product.sauces.map((sauce) => (
                  <button
                    key={sauce.id}
                    type="button"
                    onClick={() => setSelectedSauce(sauce)}
                    aria-pressed={selectedSauce?.id === sauce.id}
                    className={cn(
                      "flex-1 min-w-25 py-3 px-4 rounded-xl border-2 transition-all text-center",
                      selectedSauce?.id === sauce.id
                        ? "border-coral bg-coral/10"
                        : "border-border hover:border-coral/50",
                    )}
                  >
                    <span className="font-medium">{sauce.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Picante */}
          {product.hasSpiceLevel && product.spiceLevels && product.spiceLevels.length > 0 && (
            <div className="mb-6">
              <Label className="font-medium text-card-foreground mb-3 block">
                Nivel de Picante <span className="text-coral">*</span>
              </Label>
              <div className="flex gap-2">
                {product.spiceLevels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setSpiceLevel(level.name)}
                    aria-pressed={spiceLevel === level.name}
                    className={cn(
                      "flex-1 min-w-0 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center",
                      spiceLevel === level.name
                        ? "border-coral bg-coral/10"
                        : "border-border hover:border-coral/50",
                    )}
                  >
                    <Flame
                      className={cn(
                        "size-5 mb-1",
                        spiceLevel === level.name ? "text-coral" : "text-muted-foreground",
                      )}
                    />
                    <span className="text-[10px] font-bold uppercase">{level.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Complementos */}
          {product.hasExtras && product.extras && product.extras.length > 0 && (
            <div className="mb-6">
              <Label className="font-medium text-card-foreground mb-3 block">Complementos</Label>
              <div className="flex flex-col gap-2">
                {product.extras.map((extra) => (
                  <div
                    key={extra.id}
                    onClick={() => toggleExtra(extra)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                      selectedExtras.has(extra.id)
                        ? "border-coral bg-coral/5"
                        : "border-border hover:border-coral/50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedExtras.has(extra.id)}
                        onCheckedChange={() => toggleExtra(extra)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-card-foreground">{extra.name}</span>
                    </div>
                    <span className="text-coral font-medium">+${extra.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instrucciones Especiales */}
          <div className="mb-6">
            <Label htmlFor="special-instructions" className="font-medium text-card-foreground mb-3 block">
              Instrucciones Especiales
            </Label>
            <Textarea
              id="special-instructions"
              placeholder="Alergias, preferencias, notas para cocina..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="resize-none focus-visible:ring-coral"
              rows={3}
            />
          </div>
        </div>

        {/* Footer - Fijo */}
        <Separator />
        <div className="p-4 sm:p-6 bg-card shrink-0">
          <div className="flex items-center justify-between mb-6">
            <span className="font-medium text-card-foreground">Cantidad</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Disminuir cantidad"
                className="size-10 rounded-full border border-border flex items-center justify-center hover:border-coral hover:bg-coral/10 transition-all"
              >
                <Minus className="size-4" />
              </button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Aumentar cantidad"
                className="size-10 rounded-full border border-border flex items-center justify-center hover:border-coral hover:bg-coral/10 transition-all"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={isAdding || !product.available || !formIsValid}
            className={cn(
              "w-full h-14 text-accent-foreground text-lg font-medium rounded-xl shadow-lg transition-all",
              formIsValid
                ? "bg-coral hover:bg-coral/90 shadow-coral/25"
                : "bg-muted text-muted-foreground shadow-none cursor-not-allowed",
            )}
          >
            <span className="flex items-center gap-2">
              {isAdding ? (
                <>
                  <Check className="size-5" />
                  ¡Agregado!
                </>
              ) : !product.available ? (
                "No disponible"
              ) : !formIsValid ? (
                "Selecciona las opciones obligatorias"
              ) : onAddToCart ? (
                `${addLabel ?? "Añadir a la Mesa"} - $${totalPrice.toFixed(2)}`
              ) : (
                `Agregar al Carrito - $${totalPrice.toFixed(2)}`
              )}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
