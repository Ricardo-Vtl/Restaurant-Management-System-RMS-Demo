-- Etiqueta de sesión de demo en órdenes (solo repo demo).
-- Permite acotar el auto-marcado del tour a la sesión exacta, independiente de
-- historial o de reutilización de una mesa. NULL en datos no-demo.

alter table public.orders
  add column if not exists demo_session uuid;

create index if not exists orders_demo_session_idx on public.orders (demo_session);
