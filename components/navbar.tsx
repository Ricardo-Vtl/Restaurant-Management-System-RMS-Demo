"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingBag, UtensilsCrossed, Lock } from "lucide-react";
import { useCart, useAuth } from "@/lib/store";
import { useSiteConfig } from "@/hooks/use-site-config";
import { FALLBACK_NAME } from "@/lib/seo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#menu", label: "Menu" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#contacto", label: "Contacto" },
];

export const Navbar = function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { totalItems, setIsCartOpen } = useCart();
  const { currentUser, setIsAuthModalOpen } = useAuth();
  const { data: siteConfig } = useSiteConfig();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Secret staff login - triple click on logo
  const [clickCount, setClickCount] = useState(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleLogoClick = () => {
    clearTimeout(clickTimerRef.current);
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) {
      setIsAuthModalOpen(true);
      setClickCount(0);
      return;
    }

    clickTimerRef.current = setTimeout(() => setClickCount(0), 1000);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled ? "glass shadow-lg" : "bg-transparent",
        )}
      >
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo with circular container */}
          <Link
            href="#inicio"
            className="flex items-center gap-3"
            onClick={(e) => {
              e.preventDefault();
              handleLogoClick();
            }}
          >
            {/* Circular Logo Container */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "size-11 rounded-full flex items-center justify-center shadow-md transition-all",
                isScrolled ? "bg-navy text-primary-foreground" : "bg-coral text-accent-foreground",
              )}
            >
              {siteConfig?.logo_url ? (
                <Image
                  src={siteConfig.logo_url}
                  alt={siteConfig.name || "Logo"}
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover"
                />
              ) : (
                <UtensilsCrossed className="size-6" />
              )}
            </motion.div>

            {/* Brand Name */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={cn(
                "font-serif text-lg md:text-xl font-bold transition-colors leading-tight",
                isScrolled ? "text-navy" : "text-primary-foreground",
              )}
            >
              <span className="block max-w-[14rem] truncate">{siteConfig?.name || FALLBACK_NAME}</span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-coral relative group",
                  isScrolled ? "text-navy" : "text-primary-foreground",
                )}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-coral transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}

            {/* Staff indicator - only show when logged in */}
            {currentUser && (
              <Link
                href="/gestion"
                className={cn(
                  "flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full transition-all",
                  isScrolled
                    ? "bg-coral/10 text-coral hover:bg-coral/20"
                    : "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20",
                )}
              >
                <Lock className="size-3" />
                Gestion
              </Link>
            )}
          </div>

          {/* Right Side - Cart & Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCartOpen(true)}
              aria-label="Abrir carrito"
              className={cn(
                "relative p-2.5 rounded-full transition-all shadow-md",
                isScrolled
                  ? "bg-navy text-primary-foreground hover:bg-navy/90"
                  : "bg-coral text-accent-foreground hover:bg-coral/90",
              )}
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "absolute -top-1 -right-1 size-5 text-xs font-bold rounded-full flex items-center justify-center",
                    isScrolled
                      ? "bg-coral text-accent-foreground animate-pulse-coral"
                      : "bg-navy text-primary-foreground",
                  )}
                >
                  {totalItems > 9 ? "9+" : totalItems}
                </motion.span>
              )}
            </motion.button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              className={cn(
                "md:hidden p-2 rounded-lg transition-colors",
                isScrolled ? "text-navy hover:bg-muted" : "text-primary-foreground hover:bg-white/10",
              )}
            >
              {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-18 z-40 glass-dark md:hidden"
          >
            <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-primary-foreground text-lg font-medium py-2 border-b border-primary-foreground/10 hover:text-coral transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {currentUser && (
                <Link
                  href="/gestion"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-coral text-lg font-medium py-2"
                >
                  <Lock className="size-4" />
                  Panel de Gestion
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
