-- V9-DB-05 + V9-DB-07: integridad de órdenes/items en BD.
-- V9-DB-05: order_number lo asignaba el cliente (Date.now()), sin UNIQUE →
--   folios duplicados posibles. Ahora la secuencia asigna y hay UNIQUE.
--   - ALTER SEQUENCE ... AS bigint alinea el tipo de la secuencia (integer) con
--     la columna bigint (nota técnica del hallazgo).
--   - UNIQUE crea además el índice para la búsqueda por folio
--     (GET /api/orders?q=<n> → index lookup en vez de seq scan).
-- V9-DB-07: cero CHECK constraints → status/type TEXT libre y montos sin >= 0.
--   Listas de valores validadas contra la capa app y las RPCs vivas
--   (transition_order, reopen_order, complete_checkout, add_order_items,
--   cancel_order_items, kds-mark-items, POST /api/orders, public-orders).
-- V9-DB-02 (Fase 4): guards idempotentes — el init ya crea estos constraints;
-- ADD CONSTRAINT no soporta IF NOT EXISTS, se guarda con chequeo de pg_constraint.
-- ALTER SEQUENCE ... AS bigint es idempotente de por sí (re-tipo igual = no-op).
ALTER SEQUENCE public.orders_order_number_seq AS bigint;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_unique' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','confirmed','preparing','ready','on-the-way','delivered','completed','cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_type_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_type_check CHECK (type IN ('dine-in','delivery','take-away','pickup'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_total_check CHECK (total >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_subtotal_check CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_tax_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_tax_check CHECK (tax >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_discount_check CHECK (discount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_status_check' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_status_check CHECK (status IN ('pending','confirmed','preparing','ready','on-the-way','delivered','completed','cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_check' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_unit_price_check' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_unit_price_check CHECK (unit_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_total_price_check' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_total_price_check CHECK (total_price >= 0);
  END IF;
END $$;
