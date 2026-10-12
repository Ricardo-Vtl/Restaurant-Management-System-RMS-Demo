"use client";

import { create } from "zustand";
import type { Product, OrderItem, OrderItemModifiers, OrderType, CustomerInfo } from "@/lib/types";
import { computeItemPrice } from "@/lib/pricing";
import { generateId } from "@/lib/uuid";

interface CartState {
  cartItems: OrderItem[];
  isCartOpen: boolean;
  currentOrderType: OrderType;
  customerInfo: CustomerInfo | null;
  totalPrice: number;
  totalItems: number;
  addToCart: (product: Product, modifiers: OrderItemModifiers, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  setCurrentOrderType: (type: OrderType) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeTotals(items: OrderItem[]) {
  return {
    totalPrice: round2(items.reduce((sum, item) => sum + item.totalPrice, 0)),
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export const useCartStore = create<CartState>()((set) => ({
  cartItems: [],
  isCartOpen: false,
  currentOrderType: "dine-in",
  customerInfo: null,
  totalPrice: 0,
  totalItems: 0,
  addToCart: (product, modifiers, quantity = 1) => {
    const unitPrice = computeItemPrice(product, modifiers);

    const newItem: OrderItem = {
      id: `item-${generateId()}`,
      productId: product.id,
      name: product.name,
      quantity,
      modifiers,
      instructions: modifiers.specialInstructions,
      unit_price: unitPrice,
      totalPrice: round2(unitPrice * quantity),
    };

    set((s) => {
      const newCartItems = [...s.cartItems, newItem];
      return { cartItems: newCartItems, isCartOpen: true, ...computeTotals(newCartItems) };
    });
  },
  removeFromCart: (itemId) =>
    set((s) => {
      const newCartItems = s.cartItems.filter((item) => item.id !== itemId);
      return { cartItems: newCartItems, ...computeTotals(newCartItems) };
    }),
  updateCartQuantity: (itemId, quantity) =>
    set((s) => {
      const newCartItems = s.cartItems
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity, totalPrice: round2(item.unit_price * quantity) }
            : item,
        )
        .filter((i) => i.quantity > 0);
      return { cartItems: newCartItems, ...computeTotals(newCartItems) };
    }),
  clearCart: () => set({ cartItems: [], totalPrice: 0, totalItems: 0 }),
  setIsCartOpen: (open) => set({ isCartOpen: open }),
  setCurrentOrderType: (type) => set({ currentOrderType: type }),
  setCustomerInfo: (info) => set({ customerInfo: info }),
}));
