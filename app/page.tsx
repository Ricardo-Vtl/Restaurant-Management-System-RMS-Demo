"use client";
import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { MenuSection } from "@/components/menu-section";
import { GallerySection } from "@/components/gallery-section";
import { ReviewsSection } from "@/components/reviews-section";
import { ContactSection } from "@/components/contact-section";
import dynamic from "next/dynamic";
import { FloatingCart } from "@/components/floating-cart";
import { Footer } from "@/components/footer";
import { DemoLanding } from "@/components/demo/demo-landing";

const CartDrawer = dynamic(() => import("@/components/cart-drawer").then((m) => m.CartDrawer), {
  ssr: false,
  loading: () => null,
});
const AuthModal = dynamic(() => import("@/components/auth-modal").then((m) => m.AuthModal), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <MenuSection />
      <GallerySection />
      <ReviewsSection />
      <ContactSection />
      <Footer />
      <CartDrawer />
      <FloatingCart />
      <AuthModal />
      <DemoLanding />
    </div>
  );
}
