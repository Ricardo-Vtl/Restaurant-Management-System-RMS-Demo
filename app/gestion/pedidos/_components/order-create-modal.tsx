"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useActiveProducts } from "@/hooks/use-products";
import { useCreateOrder, useAddItemsToOrder } from "@/hooks/use-orders";
import { formatCurrency } from "../_utils/order-helpers";
import { toast } from "sonner";
import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Store,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeItemPrice } from "@/lib/pricing";
import type { Product, OrderType, OrderItem, OrderItemModifiers, CustomerInfo } from "@/lib/types";

const ProductModal = dynamic(
  () => import("@/components/product-modal").then((m) => m.ProductModal),
  { ssr: false, loading: () => null },
);

interface OrderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORDER_TYPES: { value: OrderType; label: string; icon: typeof UtensilsCrossed; desc: string }[] = [
  { value: "pickup", label: "Mostrador", icon: Store, desc: "Cliente recoge en sucursal" },
  { value: "take-away", label: "Para Llevar", icon: ShoppingBag, desc: "Cliente se lleva" },
  { value: "delivery", label: "Delivery", icon: Truck, desc: "Envio a domicilio" },
];

type Step = "type" | "products" | "confirm";

interface CartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  modifiers: OrderItemModifiers;
  unit_price: number;
  totalPrice: number;
}

export function OrderCreateModal({ isOpen, onClose }: OrderCreateModalProps) {
  const [step, setStep] = useState<Step>("type");
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products = [] } = useActiveProducts();
  const createOrder = useCreateOrder();
  const addItems = useAddItemsToOrder();

  const filteredProducts = products.filter(
    (p) => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const categories = ["TODOS", ...Array.from(new Set(filteredProducts.map((p) => p.category)))];
  const [activeCategory, setActiveCategory] = useState("TODOS");

  const displayedProducts = filteredProducts.filter(
    (p) => activeCategory === "TODOS" || p.category === activeCategory,
  );

  const total = cartItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const isSubmitting = createOrder.isPending || addItems.isPending;

  useEffect(() => {
    if (!isOpen) {
      setStep("type");
      setOrderType(null);
      setCartItems([]);
      setCustomerInfo({ name: "", phone: "" });
      setNotes("");
      setSearchTerm("");
      setActiveCategory("TODOS");
    }
  }, [isOpen]);

  const handleAddToCart = useCallback(
    (product: Product, modifiers: OrderItemModifiers, quantity: number) => {
      const unitPrice = computeItemPrice(product, modifiers);

      const newItem: CartItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        name: product.name,
        quantity,
        modifiers,
        unit_price: unitPrice,
        totalPrice: unitPrice * quantity,
      };
      setCartItems((prev) => [...prev, newItem]);
      setSelectedProduct(null);
    },
    [],
  );

  const removeCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = async () => {
    if (!orderType) return;
    if (cartItems.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    if (orderType === "delivery" && (!customerInfo.name || !customerInfo.phone)) {
      toast.error("Delivery requiere nombre y telefono");
      return;
    }

    try {
      const orderRes = await createOrder.mutateAsync({
        type: orderType,
        status: "confirmed",
        customer_info: orderType === "delivery" ? customerInfo : undefined,
        notes: notes || undefined,
      });

      if (cartItems.length > 0 && orderRes?.id) {
        await addItems.mutateAsync({
          items: cartItems.map((item) => ({
            order_id: orderRes.id as string,
            product_id: item.productId,
            quantity: item.quantity,
            modifiers: item.modifiers as never,
          })),
        });
      }

      toast.success("Orden creada exitosamente");
      onClose();
    } catch {
      toast.error("Error al crear orden");
    }
  };

  const nextStep = () => {
    if (step === "type" && orderType) setStep("products");
    else if (step === "products" && cartItems.length > 0) setStep("confirm");
  };

  const prevStep = () => {
    if (step === "products") setStep("type");
    else if (step === "confirm") setStep("products");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step !== "type" && (
                  <Button variant="ghost" size="icon" className="size-10 sm:size-8" aria-label="Volver" onClick={prevStep}>
                    <ArrowLeft size={16} />
                  </Button>
                )}
                <div>
                  <DialogTitle className="text-lg font-black italic text-navy">
                    Nueva Orden
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {step === "type" && "Selecciona el tipo de orden"}
                    {step === "products" && "Agrega productos a la orden"}
                    {step === "confirm" && "Confirma y crea la orden"}
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs sm:text-[10px] font-black uppercase">
                {step === "type" ? "1/3" : step === "products" ? "2/3" : "3/3"}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex flex-col flex-1 min-h-0">
            {step === "type" && (
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 flex flex-col gap-3">
                {ORDER_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = orderType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setOrderType(t.value)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                        isSelected
                          ? "border-navy bg-navy/5"
                          : "border-border hover:border-navy/30",
                      )}
                    >
                      <div
                        className={cn(
                          "size-12 rounded-xl flex items-center justify-center",
                          isSelected ? "bg-navy text-white" : "bg-muted text-navy",
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-black text-navy text-sm uppercase italic">{t.label}</p>
                        <p className="text-xs sm:text-[10px] text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {step === "products" && (
              <div className="flex flex-col flex-1 min-h-0 px-6 pb-4">
                <div className="relative shrink-0 mb-3">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={14}
                  />
                  <Input
                    placeholder="Buscar producto..."
                    aria-label="Buscar producto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 text-sm sm:h-9 sm:text-xs"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-2 shrink-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-3 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-colors",
                        activeCategory === cat
                          ? "bg-navy text-white"
                          : "bg-muted text-foreground hover:bg-muted/80",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {displayedProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="flex flex-col p-3 rounded-xl border border-border hover:border-navy/30 text-left transition-colors bg-white"
                      >
                        <p className="font-black text-navy text-xs italic truncate">{product.name}</p>
                        <p className="text-xs sm:text-[10px] text-muted-foreground mt-1 truncate">
                          {product.category}
                        </p>
                        <p className="font-black text-navy text-sm mt-2 italic">
                          {formatCurrency(product.basePrice)}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-3" />

                {cartItems.length > 0 ? (
                  <div className="shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black uppercase text-muted-foreground">
                        Carrito ({cartItems.length})
                      </p>
                      <p className="font-black text-navy text-lg italic">{formatCurrency(total)}</p>
                    </div>
                    <ScrollArea className="max-h-32">
                      <div className="flex flex-col gap-1.5">
                        {cartItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs sm:text-[10px] font-black text-navy bg-navy/10 size-5 rounded flex items-center justify-center shrink-0">
                                {item.quantity}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs sm:text-[10px] font-black text-navy italic">
                                {formatCurrency(item.totalPrice)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 p-0 text-destructive"
                                aria-label="Quitar producto"
                                onClick={() => removeCartItem(item.id)}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4 shrink-0">
                    Agrega productos para continuar
                  </p>
                )}
              </div>
            )}

            {step === "confirm" && (
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 flex flex-col gap-4">
                {orderType === "delivery" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-black uppercase text-muted-foreground">
                      Datos del Cliente
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="customer-name" className="text-xs sm:text-[10px] font-bold uppercase">
                          Nombre *
                        </Label>
                        <Input
                          id="customer-name"
                          value={customerInfo.name}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="h-11 text-sm sm:h-9 sm:text-xs"
                          placeholder="Nombre del cliente"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="customer-phone" className="text-xs sm:text-[10px] font-bold uppercase">
                          Telefono *
                        </Label>
                        <Input
                          id="customer-phone"
                          value={customerInfo.phone}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          className="h-11 text-sm sm:h-9 sm:text-xs"
                          placeholder="555-123-4567"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="customer-address" className="text-xs sm:text-[10px] font-bold uppercase">
                        Direccion
                      </Label>
                      <Input
                        id="customer-address"
                        value={customerInfo.address ?? ""}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, address: e.target.value }))
                        }
                        className="h-11 text-sm sm:h-9 sm:text-xs"
                        placeholder="Calle, numero, colonia"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="order-notes" className="text-xs sm:text-[10px] font-bold uppercase">
                    Notas (opcional)
                  </Label>
                  <Input
                    id="order-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-11 text-sm sm:h-9 sm:text-xs"
                    placeholder="Instrucciones especiales..."
                  />
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tipo de orden</span>
                    <span className="font-bold text-navy italic">
                      {ORDER_TYPES.find((t) => t.value === orderType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Productos</span>
                    <span className="font-bold text-navy italic">{cartItems.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-black text-navy uppercase italic">Total</span>
                    <span className="font-black text-navy text-xl italic">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4 flex justify-between items-center shrink-0">
            <div>
              {step !== "type" && cartItems.length > 0 && (
                <span className="text-sm font-black text-navy italic">{formatCurrency(total)}</span>
              )}
            </div>
            <div className="flex gap-2">
              {step === "confirm" ? (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    (orderType === "delivery" && (!customerInfo.name || !customerInfo.phone))
                  }
                  className="h-10 rounded-xl font-black uppercase italic text-xs gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Orden"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={
                    (step === "type" && !orderType) ||
                    (step === "products" && cartItems.length === 0)
                  }
                  className="h-10 rounded-xl font-black uppercase italic text-xs gap-2"
                >
                  Siguiente
                  <ArrowRight size={14} />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        addLabel="Añadir al Pedido"
      />
    </>
  );
}
