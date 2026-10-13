"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface CancelOrderDialogProps {
  orderId: string | null;
  orderNumber: number | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, orderNumber: number, reason: string) => void;
  isLoading?: boolean;
}

export function CancelOrderDialog({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!orderId || !orderNumber || !reason.trim()) return;
    onConfirm(orderId, orderNumber, reason.trim());
    setReason("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle size={20} className="text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-left">
                Cancelar Orden #{orderNumber}
              </DialogTitle>
              <DialogDescription className="text-left">
                Esta accion no se puede deshacer. Indica el motivo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          <Textarea
            placeholder="Motivo de cancelacion..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24 resize-none text-sm"
            maxLength={200}
            autoFocus
          />
          <p className="mt-1 text-right text-xs sm:text-[10px] text-muted-foreground">
            {reason.length}/200
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? "Cancelando..." : "Confirmar Cancelacion"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
