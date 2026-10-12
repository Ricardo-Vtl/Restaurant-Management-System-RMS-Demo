-- V9-SEC-01: Revocar escrituras directas a clientes (anon/authenticated).
-- Recomendación opción 2 de AUDITORIA_v9: "lecturas directas + escrituras solo-API".
-- Cierra el bypass de requireRole() vía PostgREST directo: ningún staff puede
-- INSERT/UPDATE/DELETE sin pasar por la API Next.js. El service role
-- (supabaseAdmin) no se ve afectado. Las policies de escritura quedan inertes;
-- RLS conserva SELECT (staff autenticado). staff_users incluida (agenda N7:
-- anon tenía arwdDxtm en las 6 tablas; solo posee policy SELECT self).
REVOKE INSERT, UPDATE, DELETE ON public.orders, public.order_items, public.products, public.tables, public.restaurant_config, public.staff_users FROM anon, authenticated;
