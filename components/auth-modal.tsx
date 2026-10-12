"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, LogOut, Loader2, X, LayoutGrid, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DemoPinHint } from "@/components/demo/pin-hint";
import { cn } from "@/lib/utils";

export function AuthModal() {
  const router = useRouter();
  const { isAuthModalOpen, setIsAuthModalOpen, login, currentUser, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setPin("");
      setError("");
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAuthModalOpen]);

  const executeLogin = async (currentPin: string) => {
    if (isLoading || currentPin.length < 6) return;
    setIsLoading(true);
    setError("");

    try {
      const errorMsg = await login(currentPin);
      if (errorMsg) {
        setError(errorMsg);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        if (errorMsg === "PIN incorrecto") {
          setPin("");
        }
      } else {
        setIsAuthModalOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (isLoading) return;
    // Si el pin ya está lleno (posible autofill/stale del input oculto), empezar de cero
    const newPin = pin.length >= 6 ? digit : pin + digit;
    setPin(newPin);
    if (newPin.length === 6) executeLogin(newPin);
  };

  const handleBackspace = () => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    if (isLoading) return;
    setPin("");
    setError("");
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {currentUser ? (
          <>
            <div className="bg-navy p-8 text-center relative">
              <div className="size-20 bg-coral rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-coral/20">
                <span className="text-3xl font-bold text-accent-foreground">{currentUser.name.charAt(0)}</span>
              </div>
              <DialogTitle className="font-serif text-xl font-bold text-primary-foreground">{currentUser.name}</DialogTitle>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <ShieldCheck className="size-3.5 text-coral" />
                <DialogDescription className="text-primary-foreground/60 text-sm capitalize">
                  {currentUser.role}
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-3">
              <Button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  router.push("/gestion");
                }}
                className="w-full bg-coral hover:bg-coral/90 h-12 text-base"
              >
                <LayoutGrid className="size-4 mr-2" />
                Ir al Panel de Gestión
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  setIsAuthModalOpen(false);
                  router.push("/");
                }}
                className="w-full h-11"
              >
                <LogOut className="size-4 mr-2" />
                Cerrar Sesión
              </Button>
              <Button variant="ghost" onClick={() => setIsAuthModalOpen(false)} className="w-full h-10 text-muted-foreground">
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-navy p-6 text-center relative">
              <div className="size-16 bg-coral rounded-full flex items-center justify-center mx-auto mb-4">
                {isLoading ? (
                  <Loader2 className="size-8 text-accent-foreground animate-spin" />
                ) : (
                  <Lock className="size-8 text-accent-foreground" />
                )}
              </div>
              <DialogTitle className="font-serif text-xl font-bold text-primary-foreground">Acceso Staff</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 text-sm mt-1">
                {isLoading ? "Verificando..." : "Ingresa tu PIN de 6 dígitos"}
              </DialogDescription>
            </div>

            <div className="p-6">
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "size-12 rounded-xl border-2 flex items-center justify-center transition-all",
                      pin.length > i ? "border-coral bg-coral/10" : "border-border",
                      error && "border-destructive bg-destructive/10",
                    )}
                  >
                    {pin.length > i && <div className="size-3 rounded-full bg-coral" />}
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-destructive text-sm mb-4">
                  <AlertCircle className="size-4" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    disabled={isLoading}
                    onClick={() => handlePinInput(num.toString())}
                    className="h-14 rounded-xl bg-muted hover:bg-muted/80 font-semibold text-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
                <button
                  disabled={isLoading}
                  onClick={handleClear}
                  className="h-14 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-all disabled:opacity-50"
                >
                  Borrar
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => handlePinInput("0")}
                  className="h-14 rounded-xl bg-muted hover:bg-muted/80 font-semibold text-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  0
                </button>
                <button
                  disabled={isLoading}
                  onClick={handleBackspace}
                  aria-label="Borrar dígito"
                  className="h-14 rounded-xl bg-muted hover:bg-muted/80 transition-all disabled:opacity-50"
                >
                  <X className="size-5 mx-auto" aria-hidden="true" />
                </button>
              </div>

              <DemoPinHint />

              <p className="text-center text-muted-foreground text-xs mt-6">
                Consulta a administración si olvidaste tu PIN.
              </p>
            </div>

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Ingresa tu PIN de 6 dígitos"
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 6) {
                  setPin(val);
                  if (val.length === 6) executeLogin(val);
                }
              }}
              className="sr-only"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
