"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Product, OrderItem, Table, OrderItemModifiers } from "@/lib/types";
import { useMenuProducts } from "@/hooks/use-products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Minus, ShoppingBasket, Trash2, Utensils, X, Loader2, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { computeItemPrice } from "@/lib/pricing";
import { Empty, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useEnviarComanda } from "../../_hooks/useEnviarComanda";

const ProductModal = dynamic(() => import("@/components/product-modal").then((m) => m.ProductModal), { ssr: false, loading: () => null });

interface Props {
  mesa: Table;
  onProductSelect?: (product: Product) => void;
}

export const MenuTab = ({ mesa, onProductSelect }: Props) => {
  const { data: allProducts = [], isLoading, isError } = useMenuProducts();
  const { enviarComanda, isSending, isOrderLoading } = useEnviarComanda({ mesaId: mesa.id, mesaNumber: mesa.number });

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("TODOS");
  const [tempCart, setTempCart] = useState<OrderItem[]>([]);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const selectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(selectTimerRef.current);
  }, []);
  // 1. FILTRAR SÓLO PRODUCTOS ACTIVOS (Catálogo vivo, se descartan eliminados lógicos)
  const activeProducts = useMemo(() => allProducts.filter((p) => p.is_active !== false), [allProducts]);

  // Memorizar categorías basadas únicamente en productos activos
  const categories = useMemo(() => {
    const cats = activeProducts.map((p) => p.category);
    return ["TODOS", ...Array.from(new Set(cats))];
  }, [activeProducts]);

  // 2. FILTRADO DE BÚSQUEDA Y CATEGORÍA (Mantenemos los agotados para renderizarlos deshabilitados)
  const filteredProducts = useMemo(
    () =>
      activeProducts.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = activeCategory === "TODOS" || p.category === activeCategory;
        return matchesSearch && matchesCat;
      }),
    [activeProducts, searchTerm, activeCategory],
  );

  const handleProductClick = (product: Product) => {
    if (!product.available) return;

    setSelectedProduct(null);
    clearTimeout(selectTimerRef.current);
    selectTimerRef.current = setTimeout(() => {
      setSelectedProduct(product);
      if (onProductSelect) onProductSelect(product);
    }, 10);
  };

  const handleConfirmConfig = (product: Product, modifiers: OrderItemModifiers, quantity: number) => {
    const unitPrice = computeItemPrice(product, modifiers);

    const newItemId = `${product.id}-${Date.now()}`;
    const newItem: OrderItem = {
      id: newItemId,
      productId: product.id,
      name: product.name,
      quantity,
      modifiers,
      unit_price: unitPrice,
      totalPrice: Number((unitPrice * quantity).toFixed(2)),
    };

    setTempCart((prev) => [...prev, newItem]);
    setSelectedProduct(null);
  };

  const removeItem = (id: string) => setTempCart((prev) => prev.filter((item) => item.id !== id));

  const updateQuantity = (id: string, delta: number) => {
    setTempCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQty,
            totalPrice: Number((item.unit_price * newQty).toFixed(2)),
          };
        }
        return item;
      }),
    );
  };

  const subtotal = Number(tempCart.reduce((acc, item) => acc + item.totalPrice, 0).toFixed(2));

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
        <AlertTriangle className="text-destructive" size={32} />
        <p className="text-xs sm:text-[10px] font-black uppercase tracking-widest text-navy">
          Error al cargar el catálogo
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-muted/50 md:flex-row">
      {/* SECCIÓN PRODUCTOS */}
      <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
        {/* Categorías */}
        <div className="border-b bg-white shrink-0 overflow-x-auto scrollbar-hide touch-pan-x">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex p-2 gap-2 min-w-max bg-transparent h-auto">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-[10px] font-black uppercase transition-all data-[state=active]:bg-coral data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-coral/20 data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Buscador */}
        <div className="p-3 md:p-4 border-b flex gap-2 items-center shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              placeholder="Buscar platillo..."
              aria-label="Buscar platillo"
              className="pl-9 h-10 bg-muted border-none rounded-xl text-xs focus-visible:ring-coral"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="md:hidden relative border-border bg-white size-10 p-0"
            aria-label="Abrir carrito móvil"
            onClick={() => setShowCartMobile(true)}
          >
            <ShoppingBasket size={18} className="text-navy" aria-hidden="true" />
            {tempCart.length > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 bg-coral text-white text-xs sm:text-[8px] size-4 rounded-full flex items-center justify-center font-black animate-in zoom-in">
                {tempCart.length}
              </span>
            )}
          </Button>
        </div>

        {/* Listado de Productos */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y bg-muted/30">
          {allProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full py-16">
              <Empty className="opacity-20">
                <EmptyMedia><Utensils className="size-10" /></EmptyMedia>
                <EmptyTitle>Catálogo vacío</EmptyTitle>
              </Empty>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full py-16 opacity-50">
              <p className="text-xs sm:text-[10px] font-black uppercase tracking-widest text-navy">
                Sin resultados para esta búsqueda
              </p>
            </div>
          ) : (
          <div className="p-3 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleProductClick(product);
                  }
                }}
                tabIndex={product.available ? 0 : -1}
                role="button"
                aria-disabled={!product.available}
                className={cn(
                  "group bg-white border border-border rounded-2xl p-2 flex gap-3 transition-all shadow-sm relative",
                  product.available
                    ? "hover:border-coral/40 active:scale-[0.97] cursor-pointer"
                    : "grayscale opacity-40 cursor-not-allowed select-none",
                )}
              >
                <div className="size-16 bg-muted rounded-lg shrink-0 flex items-center justify-center overflow-hidden relative">
                  {product.image ? (
                    <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                  ) : (
                    <Utensils className="text-muted-foreground" size={20} />
                  )}
                </div>
                <div className="flex flex-col justify-center py-1 min-w-0 flex-1">
                  <h4 className="font-black text-navy text-xs sm:text-[10px] uppercase italic truncate leading-tight pr-12">
                    {product.name}
                  </h4>
                  <span className="text-coral font-black text-sm mt-1">{formatCurrency(product.basePrice)}</span>
                </div>

                {!product.available && (
                  <Badge variant="secondary" className="absolute top-1/2 right-3 -translate-y-1/2 text-xs sm:text-[8px] px-1.5 py-0.5">
                    Agotado
                  </Badge>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* SECCIÓN CARRITO (COMANDA) */}
      <aside aria-live="polite"
        className={cn(
          "absolute inset-0 z-50 bg-white flex flex-col transition-transform duration-300 md:relative md:translate-x-0 md:z-0 md:w-80 md:border-l shadow-2xl md:shadow-none",
          showCartMobile ? "translate-x-0" : "translate-x-full invisible md:visible md:translate-x-0",
        )}
      >
        {/* Header Carrito */}
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBasket size={18} className="text-coral" />
            <span className="font-black text-xs sm:text-[11px] uppercase tracking-wider italic">Comanda Actual</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar carrito móvil"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setShowCartMobile(false)}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        {/* Items del Carrito */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 bg-muted/50">
          {tempCart.length === 0 ? (
            <Empty className="opacity-20">
              <EmptyMedia>
                <Plus size={40} className="text-navy" />
              </EmptyMedia>
              <EmptyTitle className="text-xs sm:text-[10px] font-black text-navy uppercase text-center">Agrega productos</EmptyTitle>
            </Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {tempCart.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-right-2"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs sm:text-[10px] font-black text-navy uppercase italic truncate">{item.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.modifiers.size && (
                          <Badge variant="secondary" className="text-xs sm:text-[8px] px-1.5 py-0.5">
                            {item.modifiers.size.name}
                          </Badge>
                        )}
                        {item.modifiers.sauce && (
                          <Badge variant="warning" className="text-xs sm:text-[8px] px-1.5 py-0.5">
                            {item.modifiers.sauce.name}
                          </Badge>
                        )}
                        {item.modifiers.extras?.map((extra) => (
                          <Badge
                            key={extra.id}
                            variant="success"
                            className="text-xs sm:text-[8px] px-1.5 py-0.5"
                          >
                            +{extra.name}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs sm:text-[10px] text-coral font-bold mt-1">{formatCurrency(item.totalPrice)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      aria-label="Eliminar artículo del carrito"
                      className="text-muted-foreground hover:text-destructive shrink-0 size-7"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-muted rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 hover:bg-white"
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label="Reducir cantidad"
                    >
                      <Minus size={10} aria-hidden="true" />
                    </Button>
                    <span className="text-xs font-black text-navy">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 hover:bg-white"
                      onClick={() => updateQuantity(item.id, 1)}
                      aria-label="Aumentar cantidad"
                    >
                      <Plus size={10} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer y Botón de Envío */}
        <Separator />
        <div className="p-4 bg-white shrink-0 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
            <span className="text-xl font-black text-navy italic">{formatCurrency(subtotal)}</span>
          </div>
          <Button
            disabled={tempCart.length === 0 || isSending}
            onClick={async () => {
              const success = await enviarComanda(tempCart);
              if (success) {
                setTempCart([]);
                setSearchTerm("");
                setActiveCategory("TODOS");
                setShowCartMobile(false);
              }
            }}
            className="w-full py-7 bg-coral hover:bg-coral/90 text-white rounded-xl font-black text-xs sm:text-[11px] uppercase italic tracking-widest shadow-lg shadow-coral/20 active:scale-95 transition-all"
          >
            {isSending ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
            {isSending ? "Enviando..." : "Enviar a Cocina"}
          </Button>
        </div>
      </aside>

      {/* MODAL CONFIGURACIÓN PRODUCTO */}
      {selectedProduct && (
        <ProductModal
          key={selectedProduct.id}
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleConfirmConfig}
        />
      )}
    </div>
  );
};
