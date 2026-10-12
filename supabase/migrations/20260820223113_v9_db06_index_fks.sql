-- V9-DB-06: FKs sin índice cubriente (advisor unindexed_foreign_keys).
-- order_items.order_id: cascada de transition_order/cancel_order_items +
--   embedded join ORDER_SELECT/useTableOrders + kds-mark-items + GET /api/order-items?order_id.
-- order_items.product_id: embedded join products(name) en ORDER_SELECT/useTableOrders.
-- orders.staff_id: chequeo de FK (sin filtros en la app hoy; 1 línea, limpia el lint).
-- Índices de columna única (no compuestos): no hay query que filtre ambos; un
-- compuesto (order_id, product_id) no cubriría el lint de product_id (prefijo
-- izquierdo, ver skill query-composite-indexes).
-- CREATE INDEX plano (no CONCURRENTLY): tabla diminuta (2 órdenes) → bloqueo
-- irrelevante, rollback limpio en fallo, y funciona en todos los paths de
-- migración (CLI v2.92+ envuelve en pipeline → CONCURRENTLY fallaría con 25001).
-- ponytail: índice plano; usar CONCURRENTLY (fuera de transacción) solo si la
-- tabla alcanza volumen real con carga de escritura sostenida.
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS orders_staff_id_idx ON public.orders (staff_id);
