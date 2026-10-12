import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "./stores/auth-store";
import { useCartStore } from "./stores/cart-store";

export const useAuth = () =>
  useAuthStore(
    useShallow((s) => ({
      currentUser: s.currentUser,
      isHydrating: s.isHydrating,
      login: s.login,
      logout: s.logout,
      isAuthModalOpen: s.isAuthModalOpen,
      setIsAuthModalOpen: s.setIsAuthModalOpen,
    })),
  );

export const useCart = () =>
  useCartStore(
    useShallow((s) => ({
      items: s.cartItems,
      addToCart: s.addToCart,
      removeFromCart: s.removeFromCart,
      updateCartQuantity: s.updateCartQuantity,
      clearCart: s.clearCart,
      totalPrice: s.totalPrice,
      totalItems: s.totalItems,
      isCartOpen: s.isCartOpen,
      setIsCartOpen: s.setIsCartOpen,
      customerInfo: s.customerInfo,
      setCustomerInfo: s.setCustomerInfo,
    })),
  );

export const useOrderType = () =>
  useCartStore(
    useShallow((s) => ({
      currentOrderType: s.currentOrderType,
      setCurrentOrderType: s.setCurrentOrderType,
    })),
  );
