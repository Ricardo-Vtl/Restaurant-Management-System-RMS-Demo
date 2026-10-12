import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/types";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

interface StatusConfig {
  label: string;
  variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
}

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: { label: "Pendiente", variant: "warning" },
  confirmed: { label: "Confirmada", variant: "warning" },
  preparing: { label: "En Cocina", variant: "info" },
  ready: { label: "Listo", variant: "info" },
  "on-the-way": { label: "En Camino", variant: "info" },
  delivered: { label: "Entregado", variant: "success" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export { STATUS_CONFIG };
