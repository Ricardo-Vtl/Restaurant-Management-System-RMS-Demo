import type { UserRole } from "@/lib/types";

// V9-ARQ-02: fuente única de permisos rol→acción, consumida por UI (components)
// y por las rutas API (requireRole). No duplica la máquina de transiciones
// (lib/status-transitions.ts canRoleTransition), solo los guards de acción.
export const ABILITIES = {
  "orders:create": ["admin", "cashier", "waiter"],
  "orders:checkout": ["admin", "cashier"],
  "orders:cancel": ["admin", "cashier"],
  "orders:deliver": ["admin", "cashier", "waiter"],
  "orders:reopen": ["admin", "waiter"],
  "orders:kds-mark": ["admin", "kitchen"],
  "products:manage": ["admin", "cashier"],
  "tables:manage": ["admin"],
  "tables:operate": ["admin", "waiter", "cashier", "kitchen"],
  "config:manage": ["admin"],
  "staff:manage": ["admin"],
  "kds:view": ["admin", "kitchen"],
  "inventory:manage": ["admin"],
  "inventory:move": ["admin", "kitchen", "cashier"],
} as const;

export type Ability = keyof typeof ABILITIES;

export function can(
  role: UserRole | null | undefined,
  ability: Ability,
): boolean {
  return !!role && (ABILITIES[ability] as readonly string[]).includes(role);
}