-- Batch 1 checklist manual 07 Oct 2026 — hallazgos #5 y #6.
--
-- #5 Totales "flapping": add_order_items incrementaba el total con TODOS los
--   items mientras cancel_order_items recalculaba a SOLO-entregados → un item
--   activo desaparecía del total para siempre (nada recalcula al entregar).
--   Semántica unificada en ambos RPCs: orders.total = SUM(total_price) de los
--   items NO cancelados (recalc idempotente, self-healing).
--
-- #6 Toast impreciso: el chequeo de cobro exige 'delivered' (correcto) pero el
--   RAISE decía "aun en cocina" cuando el item estaba 'ready'. Mensaje único
--   exacto para ready y preparing en complete_checkout/complete_order_checkout.
--
-- Sin cambio de firmas ni de lógica de negocio del cobro (sigue exigiendo
-- delivered/completed/cancelled). ACL re-aplicada tras cada CREATE (el event
-- trigger de Supabase regranta EXECUTE a anon/authenticated — patrón V9-DB-04).

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
  ), 0)
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
  ), 0)
  WHERE o.id IN (
    SELECT DISTINCT order_id
    FROM order_items
    WHERE id = ANY(p_item_ids)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_checkout(p_table_id uuid, p_payment_method public.payment_method)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_order_ids uuid[];
  v_undelivered INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tables WHERE id = p_table_id) THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  SELECT array_agg(id) INTO v_order_ids
  FROM public.orders
  WHERE table_id = p_table_id
    AND payment_status = 'pending'
    AND status <> 'cancelled';

  IF v_order_ids IS NULL OR cardinality(v_order_ids) = 0 THEN
    RAISE EXCEPTION 'No hay ordenes pendientes de cobro en esta mesa';
  END IF;

  SELECT count(*) INTO v_undelivered
  FROM public.order_items
  WHERE order_id = ANY(v_order_ids)
    AND COALESCE(status, '') NOT IN ('delivered', 'completed', 'cancelled');

  IF v_undelivered > 0 THEN
    RAISE EXCEPTION 'Hay % item(s) sin entregar; entrega antes de cobrar', v_undelivered;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'completed',
      completed_at = NOW(),
      payment_method = p_payment_method
  WHERE id = ANY(v_order_ids);

  UPDATE public.order_items
  SET status = 'completed'
  WHERE order_id = ANY(v_order_ids)
    AND COALESCE(status, '') <> 'cancelled';

  UPDATE public.tables
  SET status = 'free',
      current_guests = 0,
      "currentOrderId" = NULL,
      "totalCuenta" = 0
  WHERE id = p_table_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_order_checkout(p_order_id uuid, p_payment_method public.payment_method)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_table_id uuid;
  v_undelivered INT;
BEGIN
  SELECT table_id INTO v_table_id
  FROM public.orders
  WHERE id = p_order_id
    AND payment_status = 'pending'
    AND status <> 'cancelled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no encontrada o ya cobrada';
  END IF;

  SELECT count(*) INTO v_undelivered
  FROM public.order_items
  WHERE order_id = p_order_id
    AND COALESCE(status, '') NOT IN ('delivered', 'completed', 'cancelled');

  IF v_undelivered > 0 THEN
    RAISE EXCEPTION 'Hay % item(s) sin entregar; entrega antes de cobrar', v_undelivered;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'completed',
      completed_at = NOW(),
      payment_method = p_payment_method
  WHERE id = p_order_id;

  UPDATE public.order_items
  SET status = 'completed'
  WHERE order_id = p_order_id
    AND COALESCE(status, '') <> 'cancelled';

  -- Liberar mesa si ya no tiene órdenes pendientes de cobro
  IF v_table_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE table_id = v_table_id
        AND payment_status = 'pending'
        AND status <> 'cancelled'
    ) THEN
      UPDATE public.tables
      SET status = 'free',
          current_guests = 0,
          "currentOrderId" = NULL,
          "totalCuenta" = 0
      WHERE id = v_table_id;
    END IF;
  END IF;
END;
$function$;

-- ACL: solo service_role (+ owner). REVOKE explícito tras cada CREATE porque el
-- event trigger de Supabase regranta EXECUTE a anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.add_order_items(uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_order_items(uuid, jsonb) TO service_role, pg_database_owner;

REVOKE EXECUTE ON FUNCTION public.cancel_order_items(uuid[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_items(uuid[]) TO service_role, pg_database_owner;

REVOKE ALL ON FUNCTION public.complete_checkout(uuid, public.payment_method) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.complete_checkout(uuid, public.payment_method) TO service_role;

REVOKE ALL ON FUNCTION public.complete_order_checkout(uuid, public.payment_method) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_order_checkout(uuid, public.payment_method) TO service_role;
