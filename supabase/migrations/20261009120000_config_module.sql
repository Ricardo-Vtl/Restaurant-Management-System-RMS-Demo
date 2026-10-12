-- Módulo Config (F1 — BD) — docs/plan/MODULO_CONFIG.md v1.1
--
-- 1) restaurant_config: columnas de identidad/white-label, contacto, horarios,
--    canales, impuestos y operación + hero_slides (carrusel, §4.6).
-- 2) Índice único singleton: la tabla admite UNA sola fila (hoy se asume por
--    .limit(1).maybeSingle() sin garantía; esto la impone).
-- 3) Seed de la fila singleton con defaults NEUTROS (white-label) para que el
--    landing NO se rompa al desplegar (fail-safe: config existente gana). El
--    negocio real se captura desde /gestion/config; sin datos de otro negocio.
-- 4) orders.source ('pos'|'web') y orders.delivery_fee (entra al total).
-- 5) add_order_items / cancel_order_items: total = SUM(items no-cancelados) +
--    delivery_fee (semántica unificada 20261008120000 + fee de §4.5).
--
-- Idempotente: ADD COLUMN IF NOT EXISTS + guards pg_constraint (ADD CONSTRAINT
-- no soporta IF NOT EXISTS). ACL re-aplicada tras cada CREATE (el event trigger
-- de Supabase regranta EXECUTE a anon/authenticated — patrón V9-DB-04).

-- ── 1. restaurant_config: columnas ──────────────────────────────────────────

ALTER TABLE public.restaurant_config
  -- Identidad
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'La Buena Mesa',
  ADD COLUMN IF NOT EXISTS slogan text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS hero_slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_colors jsonb NOT NULL DEFAULT '{"primary":"#011c37","accent":"#d43a3a"}'::jsonb,
  -- Contacto
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS maps_embed_url text,
  ADD COLUMN IF NOT EXISTS socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Horarios
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Mexico_City',
  ADD COLUMN IF NOT EXISTS schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS closed_until timestamptz,
  -- Canales de venta
  ADD COLUMN IF NOT EXISTS web_orders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Impuestos
  ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS tax_label text NOT NULL DEFAULT 'IVA',
  ADD COLUMN IF NOT EXISTS rfc text,
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS ticket_footer text NOT NULL DEFAULT '',
  -- Operación POS
  ADD COLUMN IF NOT EXISTS ops jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── 2. Guards de forma para los jsonb + rangos (validación rica en la API) ──

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_config_hero_slides_shape' AND conrelid = 'public.restaurant_config'::regclass) THEN
    ALTER TABLE public.restaurant_config
      ADD CONSTRAINT restaurant_config_hero_slides_shape
      CHECK (jsonb_typeof(hero_slides) = 'array' AND jsonb_array_length(hero_slides) <= 8);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_config_brand_colors_shape' AND conrelid = 'public.restaurant_config'::regclass) THEN
    ALTER TABLE public.restaurant_config
      ADD CONSTRAINT restaurant_config_brand_colors_shape
      CHECK (jsonb_typeof(brand_colors) = 'object');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_config_socials_shape' AND conrelid = 'public.restaurant_config'::regclass) THEN
    ALTER TABLE public.restaurant_config
      ADD CONSTRAINT restaurant_config_socials_shape
      CHECK (jsonb_typeof(socials) = 'object');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_config_schedule_shape' AND conrelid = 'public.restaurant_config'::regclass) THEN
    ALTER TABLE public.restaurant_config
      ADD CONSTRAINT restaurant_config_schedule_shape
      CHECK (jsonb_typeof(schedule) = 'object');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_config_channels_shape' AND conrelid = 'public.restaurant_config'::regclass) THEN
    ALTER TABLE public.restaurant_config
      ADD CONSTRAINT restaurant_config_channels_shape
      CHECK (jsonb_typeof(channels) = 'object');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_config_ops_shape' AND conrelid = 'public.restaurant_config'::regclass) THEN
    ALTER TABLE public.restaurant_config
      ADD CONSTRAINT restaurant_config_ops_shape
      CHECK (jsonb_typeof(ops) = 'object');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_config_tax_rate_range' AND conrelid = 'public.restaurant_config'::regclass) THEN
    ALTER TABLE public.restaurant_config
      ADD CONSTRAINT restaurant_config_tax_rate_range
      CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1));
  END IF;
END $$;

-- ── 3. Singleton: exactamente una fila ──────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS restaurant_config_singleton_idx
  ON public.restaurant_config ((true));

-- ── 4. Seed singleton con la identidad actual (fail-safe: no pisa config) ────

INSERT INTO public.restaurant_config (
  name, slogan, hero_slides, brand_colors,
  phone, whatsapp_number, address, maps_embed_url, socials,
  timezone, schedule,
  web_orders_enabled, channels,
  tax_enabled, tax_label, ticket_footer, ops
)
SELECT
  'La Buena Mesa',
  'Comida fresca y bien hecha, directo a tu mesa.',
  '[]'::jsonb,
  '{"primary":"#011c37","accent":"#d43a3a"}'::jsonb,
  '',
  NULL,
  '',
  NULL,
  '{}'::jsonb,
  'America/Mexico_City',
  '{
    "0": {"open": "11:00", "close": "21:00", "closed": false},
    "1": {"open": "11:00", "close": "21:00", "closed": false},
    "2": {"open": "11:00", "close": "21:00", "closed": false},
    "3": {"open": "11:00", "close": "21:00", "closed": false},
    "4": {"open": "11:00", "close": "21:00", "closed": false},
    "5": {"open": "11:00", "close": "21:00", "closed": false},
    "6": {"open": "11:00", "close": "21:00", "closed": false}
  }'::jsonb,
  true,
  '{
    "delivery": {"enabled": true, "eta_text": "Entrega en 30-45 min", "min_order": 0, "fee": 0},
    "pickup":   {"enabled": true, "eta_text": "Listo en 20 min",     "min_order": 0, "fee": 0}
  }'::jsonb,
  false,
  'IVA',
  '',
  '{"sla_green_min": 5, "sla_yellow_min": 15, "caja_window_hours": 48}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_config);

-- ── 5. orders.source + orders.delivery_fee ──────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_source_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_source_check CHECK (source IN ('pos', 'web'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_fee_nonnegative' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_fee_nonnegative CHECK (delivery_fee >= 0);
  END IF;
END $$;

-- ── 6. RPCs de recálculo de total: SUM(items no-cancelados) + delivery_fee ──
-- Solo add_order_items y cancel_order_items recalculan total (20261008120000);
-- los checkout no lo tocan (ya viene correcto del recálculo previo).

CREATE OR REPLACE FUNCTION public.add_order_items(p_order_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Orden % no encontrada', p_order_id;
  END IF;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, modifiers, status)
  SELECT
    p_order_id,
    (item->>'product_id')::uuid,
    (item->>'quantity')::int,
    (item->>'unit_price')::numeric,
    (item->>'total_price')::numeric,
    COALESCE(item->'modifiers', '{}'::jsonb),
    'preparing'
  FROM jsonb_array_elements(p_items) AS item;

  UPDATE orders
  SET total = COALESCE((
    SELECT SUM(total_price)
    FROM order_items
    WHERE order_id = p_order_id
      AND COALESCE(status, '') <> 'cancelled'
  ), 0) + COALESCE(delivery_fee, 0)
  WHERE id = p_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_order_items(p_item_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE order_items
  SET status = 'cancelled'
  WHERE id = ANY(p_item_ids)
    AND status NOT IN ('delivered', 'completed');

  UPDATE orders AS o
  SET total = COALESCE((
    SELECT SUM(oi.total_price)
    FROM order_items AS oi
    WHERE oi.order_id = o.id
      AND COALESCE(oi.status, '') <> 'cancelled'
  ), 0) + COALESCE(o.delivery_fee, 0)
  WHERE o.id IN (
    SELECT DISTINCT order_id
    FROM order_items
    WHERE id = ANY(p_item_ids)
  );
END;
$function$;

-- ACL explícita post-CREATE (patrón V9-DB-04)
REVOKE EXECUTE ON FUNCTION public.add_order_items(uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_order_items(uuid, jsonb) TO service_role, pg_database_owner;
REVOKE EXECUTE ON FUNCTION public.cancel_order_items(uuid[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_items(uuid[]) TO service_role, pg_database_owner;
