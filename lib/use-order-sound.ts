"use client";

import { useEffect, useRef, useState } from "react";
import { playBeep } from "@/lib/play-beep";

export function useOrderSound() {
  const [enabled, setEnabled] = useState(true);
  const handlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    handlerRef.current = () => {
      if (enabled) playBeep();
    };
    window.addEventListener("order:new", handlerRef.current);
    return () => {
      if (handlerRef.current) {
        window.removeEventListener("order:new", handlerRef.current);
      }
    };
  }, [enabled]);

  return {
    soundEnabled: enabled,
    toggleSound: () => setEnabled((e) => !e),
  };
}
