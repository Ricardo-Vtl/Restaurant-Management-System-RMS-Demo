import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, ShoppingBag, Truck, Store } from "lucide-react";
import type { OrderType } from "@/lib/types";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import type { ReactNode } from "react";

interface SourceConfig {
  icon: ReactNode;
  label: string;
  variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
}

const SOURCE_CONFIG: Record<OrderType, SourceConfig> = {
  "dine-in": {
    icon: <UtensilsCrossed size={14} aria-hidden="true" />,
    label: "Comedor",
    variant: "info",
  },
  "take-away": {
    icon: <ShoppingBag size={14} aria-hidden="true" />,
    label: "Llevar",
    variant: "warning",
  },
  delivery: {
    icon: <Truck size={14} aria-hidden="true" />,
    label: "Envío",
    variant: "destructive",
  },
  pickup: {
    icon: <Store size={14} aria-hidden="true" />,
    label: "Mostrador",
    variant: "outline",
  },
};

interface OrderSourceBadgeProps {
  type: OrderType;
  className?: string;
}

export function OrderSourceBadge({ type, className }: OrderSourceBadgeProps) {
  const config = SOURCE_CONFIG[type];
  return (
    <Badge variant={config.variant} className={className}>
      {config.icon} {config.label}
    </Badge>
  );
}

export { SOURCE_CONFIG };
