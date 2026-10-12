"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/store";

export function FloatingCart() {
  const { totalItems, totalPrice, setIsCartOpen } = useCart();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCartOpen(true)}
          aria-label="Abrir carrito de compras"
          className="fixed bottom-6 right-6 z-40 bg-coral text-accent-foreground rounded-full shadow-2xl shadow-coral/30 flex items-center gap-3 px-6 py-4 md:hidden"
        >
          <div className="relative">
            <ShoppingBag className="size-6" aria-hidden="true" />
            <span className="absolute -top-2 -right-2 size-5 bg-navy text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <span className="font-bold">${totalPrice.toFixed(2)}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
