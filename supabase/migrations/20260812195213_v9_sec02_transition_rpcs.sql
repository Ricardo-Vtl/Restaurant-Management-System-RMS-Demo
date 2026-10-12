-- V9-SEC-02: RPCs transaccionales de transición de estado / agregado de items.
-- Reconstruido el 2026-08-20 desde la BD viva (pg_get_functiondef) — el archivo
-- original se aplicó fuera de banda y nunca se registró en git (drift V9-DB-02
-- detectado en la fase V9-DB-05/07). El version remoto 20260812195213 ya está
-- aplicado en la BD; este archivo alinea el estado local para que un
-- `supabase db reset`/branch reproduzca el esquema de producción.
-- Cierra V9-CAL-02 (transacción + cascada + optimista), V9-SEC-02 (bypass del
-- PATCH genérico), V9-DB-03 (total = total + delta atómico) y V9-CAL-01
-- (cancelación recalcula cada orden afectada en BD).
CREATE OR REPLACE FUNCTION public.transition_order(p_order_id uuid, p_expected_status text, p_target_status text, p_cancel_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INT;
BEGIN
  UPDATE orders
  SET status = p_target_status,
      accepted_at = CASE WHEN p_target_status = 'confirmed' THEN COALESCE(accepted_at, NOW()) ELSE accepted_at END,
      ready_at = CASE WHEN p_target_status = 'ready' THEN NOW() ELSE ready_at END,
      completed_at = CASE WHEN p_target_status = 'completed' THEN NOW() ELSE completed_at END,
      cancelled_at = CASE WHEN p_target_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
      cancel_reason = CASE WHEN p_target_status = 'cancelled' THEN p_cancel_reason ELSE cancel_reason END
  WHERE id = p_order_id
    AND status = p_expected_status;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Orden % no encontrada o estado actual distinto de %', p_order_id, p_expected_status;
  END IF;

  UPDATE order_items SET status = p_target_status WHERE order_id = p_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INT;
BEGIN
  UPDATE orders
  SET status = 'preparing',
      accepted_at = NULL
  WHERE id = p_order_id
    AND status IN ('delivered', 'completed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Orden % no reabrible: debe estar delivered o completed', p_order_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_order_items(p_order_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INT;
BEGIN
  UPDATE orders
  SET total = COALESCE(total, 0) + (
    SELECT COALESCE(SUM((item->>'total_price')::numeric), 0)
    FROM jsonb_array_elements(p_items) AS item
  )
  WHERE id = p_order_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_order_items(p_item_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order record;
BEGIN
  UPDATE order_items
  SET status = 'cancelled'
  WHERE id = ANY(p_item_ids)
    AND status NOT IN ('delivered', 'completed');

  FOR v_order IN
    SELECT DISTINCT order_id
    FROM order_items
    WHERE id = ANY(p_item_ids)
  LOOP
    UPDATE orders
    SET total = COALESCE((
      SELECT SUM(total_price)
      FROM order_items
      WHERE order_id = v_order.order_id
        AND status = 'delivered'
    ), 0)
    WHERE id = v_order.order_id;
  END LOOP;
END;
$function$;

-- Grants solo service_role (ACL verificada en BD viva: postgres, service_role,
-- pg_database_owner). Cierra la exposición de mutaciones vía PostgREST.
REVOKE EXECUTE ON FUNCTION public.transition_order(uuid, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, text, text, text) TO service_role, pg_database_owner;

REVOKE EXECUTE ON FUNCTION public.reopen_order(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_order(uuid) TO service_role, pg_database_owner;

REVOKE EXECUTE ON FUNCTION public.add_order_items(uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_order_items(uuid, jsonb) TO service_role, pg_database_owner;

REVOKE EXECUTE ON FUNCTION public.cancel_order_items(uuid[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_items(uuid[]) TO service_role, pg_database_owner;
