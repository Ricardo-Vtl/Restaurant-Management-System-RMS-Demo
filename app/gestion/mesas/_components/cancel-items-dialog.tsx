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
import { AlertTriangle, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OrderWithItems } from "@/hooks/use-orders";

interface CancelItemsDialogProps {
  items: Array<{
    id: string;
    quantity: number;
    products?: { name: string } | null;
    total_price: number;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function CancelItemsDialog({
  items,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancelItemsDialogProps) {
  const [reason, setReason] = useState("");

  const totalCancel = items.reduce((sum, item) => sum + item.total_price, 0);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
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
                Cancelar {items.length} item(s)
              </DialogTitle>
              <DialogDescription className="text-left">
                Esta accion no se puede deshacer. Indica el motivo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-48 py-2">
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <X size={14} className="text-destructive shrink-0" />
                  <span className="text-xs sm:text-[10px] font-black text-coral shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="text-sm font-black text-navy italic truncate">
                    {item.products?.name}
                  </span>
                </div>
                <span className="text-sm font-black text-muted-foreground shrink-0 ml-2">
                  ${item.total_price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="py-2 border-t border-border">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Total a cancelar
            </span>
            <span className="text-lg font-black text-destructive italic">
              ${totalCancel.toFixed(2)}
            </span>
          </div>
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
