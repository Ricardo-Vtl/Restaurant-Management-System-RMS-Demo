-- Módulo Logística/Inventario (plan v1.0, docs/plan/MODULO_INVENTARIO.md):
--   • supplies               — insumos con stock y mínimo
--   • supply_movements       — libro INMUTABLE (in/out/waste/adjust), delta firmado
--   • recipes                — producto (+tamaño opcional) → insumo × cantidad
--   • order_items.depleted_at — idempotencia del descuento automático
-- Descuento automático: cuando la orden entra a 'preparing' (comanda de mesa al
-- insertar items; walk-in/web al aceptar KDS). Cancela antes de 'ready' ⇒ revierte.
-- Doctrina V9-SEC-01: escrituras solo vía API (service role); RLS conserva SELECT
-- staff. Los DEFAULT PRIVILEGES de Supabase otorgan ALL a tablas nuevas ⇒ REVOKE
-- explícito obligatorio. Funciones: SECURITY DEFINER + search_path = '' + REVOKE.

-- ── Enum de tipos de movimiento (guard idempotente, patrón payment_method) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'supply_movement_type'
  ) THEN
    CREATE TYPE public.supply_movement_type AS ENUM ('in', 'out', 'waste', 'adjust');
  END IF;
END $$;

-- ── Tablas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('kg', 'g', 'l', 'ml', 'pza')),
  stock_current numeric(12,3) NOT NULL DEFAULT 0,
  stock_min numeric(12,3) NOT NULL DEFAULT 0 CHECK (stock_min >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- quantity = delta FIRMADO (+ entrada, − salida/merma, ± ajuste). Nunca 0.
-- stock_after = snapshot post-movimiento (auditoría sin recomputar).
CREATE TABLE IF NOT EXISTS public.supply_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id uuid NOT NULL REFERENCES public.supplies(id) ON DELETE RESTRICT,
  type public.supply_movement_type NOT NULL,
  quantity numeric(12,3) NOT NULL CHECK (quantity <> 0),
  stock_after numeric(12,3) NOT NULL,
  reason text,
  staff_id uuid REFERENCES public.staff_users(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- size_id = id de ProductOption dentro de products.sizes (JSON, sin FK posible);
-- NULL = receta base. Match: filas del tamaño del item → si no, base.
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id text,
  supply_id uuid NOT NULL REFERENCES public.supplies(id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recipes_unique_idx
  ON public.recipes (product_id, COALESCE(size_id, ''), supply_id);
CREATE INDEX IF NOT EXISTS supply_movements_supply_created_idx
  ON public.supply_movements (supply_id, created_at DESC);
CREATE INDEX IF NOT EXISTS supply_movements_order_item_idx
  ON public.supply_movements (order_item_id) WHERE order_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS supply_movements_staff_id_idx
  ON public.supply_movements (staff_id);
CREATE INDEX IF NOT EXISTS recipes_supply_id_idx
  ON public.recipes (supply_id);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS depleted_at timestamptz;

-- ── Descuento automático (funciones internas) ───────────────────────────────

-- Descuenta el stock de un item según la receta del producto. Idempotente por
-- depleted_at (reaperturas/re-transiciones no duplican). NUNCA valida stock:
-- un resultado negativo es señal de conteo desactualizado, no un bloqueo de
-- venta (ponytail: negativos permitidos; el conteo físico corrige).
-- ponytail: loop ORDER BY supply_id — orden fijo de locks, evita deadlocks
-- entre transacciones concurrentes; la receta de un plato son pocas líneas.
CREATE OR REPLACE FUNCTION public.deplete_order_item_stock(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_item record;
  v_size text;
  v_use_size boolean;
  v_line record;
  v_after numeric;
BEGIN
  UPDATE public.order_items oi
  SET depleted_at = now()
  WHERE oi.id = p_item_id
    AND oi.depleted_at IS NULL
    AND oi.status <> 'cancelled'
    AND oi.product_id IS NOT NULL
  RETURNING oi.product_id, oi.quantity, oi.modifiers
  INTO v_item;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_size := v_item.modifiers->'size'->>'id';

  SELECT EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.product_id = v_item.product_id
      AND r.size_id = v_size
  ) INTO v_use_size;

  FOR v_line IN
    SELECT r.supply_id, SUM(r.quantity * v_item.quantity) AS qty
    FROM public.recipes r
    WHERE r.product_id = v_item.product_id
      AND CASE WHEN v_use_size THEN r.size_id = v_size ELSE r.size_id IS NULL END
    GROUP BY r.supply_id
    ORDER BY r.supply_id
  LOOP
    UPDATE public.supplies s
    SET stock_current = s.stock_current - v_line.qty,
        updated_at = now()
    WHERE s.id = v_line.supply_id
    RETURNING s.stock_current INTO v_after;

    INSERT INTO public.supply_movements
      (supply_id, type, quantity, stock_after, reason, order_item_id)
    VALUES
      (v_line.supply_id, 'out', -v_line.qty, v_after, 'Descuento automático por venta', p_item_id);
  END LOOP;
END;
$function$;

-- Revierte el neto descontado de un item cancelado (movimientos compensatorios
-- 'in'); deja depleted_at = NULL (el libro queda neto 0 para ese item).
CREATE OR REPLACE FUNCTION public.revert_order_item_stock(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_line record;
  v_after numeric;
BEGIN
  -- Defensivo: solo items cancelados que fueron descontados
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.id = p_item_id
      AND oi.status = 'cancelled'
      AND oi.depleted_at IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  FOR v_line IN
    SELECT m.supply_id, SUM(m.quantity) AS net
    FROM public.supply_movements m
    WHERE m.order_item_id = p_item_id
    GROUP BY m.supply_id
    HAVING SUM(m.quantity) < 0
    ORDER BY m.supply_id
  LOOP
    UPDATE public.supplies s
    SET stock_current = s.stock_current - v_line.net,
        updated_at = now()
    WHERE s.id = v_line.supply_id
    RETURNING s.stock_current INTO v_after;

    INSERT INTO public.supply_movements
      (supply_id, type, quantity, stock_after, reason, order_item_id)
    VALUES
      (v_line.supply_id, 'in', -v_line.net, v_after, 'Reversa por cancelación de item', p_item_id);
  END LOOP;

  UPDATE public.order_items
  SET depleted_at = NULL
  WHERE id = p_item_id;
END;
$function$;

-- ── Triggers del descuento ──────────────────────────────────────────────────

-- Comanda de mesa: la orden ya nace 'preparing' cuando se insertan los items.
CREATE OR REPLACE FUNCTION public.trg_order_items_deplete_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status <> 'cancelled'
     AND EXISTS (
       SELECT 1 FROM public.orders o
       WHERE o.id = NEW.order_id AND o.status = 'preparing'
     ) THEN
    PERFORM public.deplete_order_item_stock(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Walk-in/web: la orden pasa a 'preparing' al aceptarse en KDS (y reaperturas).
CREATE OR REPLACE FUNCTION public.trg_orders_deplete_on_preparing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_item record;
BEGIN
  FOR v_item IN
    SELECT oi.id
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.status <> 'cancelled'
      AND oi.depleted_at IS NULL
    ORDER BY oi.id
  LOOP
    PERFORM public.deplete_order_item_stock(v_item.id);
  END LOOP;
  RETURN NEW;
END;
$function$;

-- Cancelación: repone solo si el item nunca se cocinó (no llegó a 'ready').
-- ponytail: heurística 'ready' = cocinado; un plato ya hecho es merma real,
-- la captura el conteo físico (no se auto-repone).
CREATE OR REPLACE FUNCTION public.trg_order_items_revert_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.status IN ('pending', 'confirmed', 'preparing') THEN
    PERFORM public.revert_order_item_stock(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS order_items_deplete_on_insert ON public.order_items;
CREATE TRIGGER order_items_deplete_on_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_items_deplete_on_insert();

DROP TRIGGER IF EXISTS orders_deplete_on_preparing ON public.orders;
CREATE TRIGGER orders_deplete_on_preparing
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'preparing' AND OLD.status IS DISTINCT FROM 'preparing')
  EXECUTE FUNCTION public.trg_orders_deplete_on_preparing();

DROP TRIGGER IF EXISTS order_items_revert_on_cancel ON public.order_items;
CREATE TRIGGER order_items_revert_on_cancel
  AFTER UPDATE OF status ON public.order_items
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION public.trg_order_items_revert_on_cancel();

-- ── RPCs manuales ───────────────────────────────────────────────────────────

-- Entrada/salida/merma manual. Valida stock >= 0 resultante (a diferencia del
-- descuento automático, que nunca bloquea).
CREATE OR REPLACE FUNCTION public.add_supply_movement(
  p_supply_id uuid,
  p_type public.supply_movement_type,
  p_quantity numeric,
  p_reason text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_delta numeric;
  v_after numeric;
  v_unit text;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;
  IF p_type NOT IN ('in', 'out', 'waste') THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;

  v_delta := CASE WHEN p_type = 'in' THEN p_quantity ELSE -p_quantity END;

  UPDATE public.supplies s
  SET stock_current = s.stock_current + v_delta,
      updated_at = now()
  WHERE s.id = p_supply_id AND s.is_active
  RETURNING s.stock_current, s.unit INTO v_after, v_unit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado o inactivo';
  END IF;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: hay % % y se intenta descontar %', 
      v_after + p_quantity, v_unit, p_quantity;
  END IF;

  INSERT INTO public.supply_movements
    (supply_id, type, quantity, stock_after, reason, staff_id)
  VALUES
    (p_supply_id, p_type, v_delta, v_after, p_reason, p_staff_id);

  RETURN v_after;
END;
$function$;

-- Conteo físico: fija el stock al valor contado y registra el delta (±) como
-- movimiento 'adjust'. Sin diferencia ⇒ no-op (no ensucia el libro).
CREATE OR REPLACE FUNCTION public.set_supply_stock(
  p_supply_id uuid,
  p_counted numeric,
  p_reason text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_current numeric;
  v_delta numeric;
BEGIN
  IF p_counted IS NULL OR p_counted < 0 THEN
    RAISE EXCEPTION 'El conteo no puede ser negativo';
  END IF;

  SELECT s.stock_current INTO v_current
  FROM public.supplies s
  WHERE s.id = p_supply_id AND s.is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado o inactivo';
  END IF;

  v_delta := p_counted - v_current;
  IF v_delta = 0 THEN
    RETURN v_current;
  END IF;

  UPDATE public.supplies s
  SET stock_current = p_counted,
      updated_at = now()
  WHERE s.id = p_supply_id;

  INSERT INTO public.supply_movements
    (supply_id, type, quantity, stock_after, reason, staff_id)
  VALUES
    (p_supply_id, 'adjust', v_delta, p_counted, p_reason, p_staff_id);

  RETURN p_counted;
END;
$function$;

-- Reemplazo atómico de la receta de un producto (p_lines = [{size_id?, supply_id, quantity}]).
CREATE OR REPLACE FUNCTION public.set_product_recipe(p_product_id uuid, p_lines jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_product_id) THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  DELETE FROM public.recipes r WHERE r.product_id = p_product_id;

  INSERT INTO public.recipes (product_id, size_id, supply_id, quantity)
  SELECT
    p_product_id,
    NULLIF(line->>'size_id', ''),
    (line->>'supply_id')::uuid,
    (line->>'quantity')::numeric
  FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb)) AS line;
END;
$function$;

-- ── ACL de funciones ────────────────────────────────────────────────────────
-- RPCs: solo service_role (la API valida rol). Internas/trigger: sin EXECUTE.
REVOKE ALL ON FUNCTION public.add_supply_movement(uuid, public.supply_movement_type, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_supply_movement(uuid, public.supply_movement_type, numeric, text, uuid) TO service_role, pg_database_owner;

REVOKE ALL ON FUNCTION public.set_supply_stock(uuid, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_supply_stock(uuid, numeric, text, uuid) TO service_role, pg_database_owner;

REVOKE ALL ON FUNCTION public.set_product_recipe(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_recipe(uuid, jsonb) TO service_role, pg_database_owner;

REVOKE ALL ON FUNCTION public.deplete_order_item_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revert_order_item_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_order_items_deplete_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_orders_deplete_on_preparing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_order_items_revert_on_cancel() FROM PUBLIC, anon, authenticated;

-- ── RLS + ACL de tablas (doctrina V9-SEC-01) ───────────────────────────────
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplies_select ON public.supplies;
CREATE POLICY supplies_select ON public.supplies
  FOR SELECT USING (public.is_staff_authenticated());

DROP POLICY IF EXISTS supply_movements_select ON public.supply_movements;
CREATE POLICY supply_movements_select ON public.supply_movements
  FOR SELECT USING (public.is_staff_authenticated());

DROP POLICY IF EXISTS recipes_select ON public.recipes;
CREATE POLICY recipes_select ON public.recipes
  FOR SELECT USING (public.is_staff_authenticated());

REVOKE INSERT, UPDATE, DELETE ON public.supplies, public.supply_movements, public.recipes FROM anon, authenticated;
