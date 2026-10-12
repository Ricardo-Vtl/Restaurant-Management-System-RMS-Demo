-- Fix hallazgo #2 (checklist manual 07 Oct 2026): la cascada de transition_order
-- aplicaba p_target_status a TODOS los items de la orden sin filtro de estado:
--   • resucitaba items 'cancelled' (volvían a la vida y se cobraban)
--   • regresaba items 'delivered'/'completed' a 'ready'/'preparing'
--     (p. ej. tras reopen, al promover preparing→ready)
-- Cascada solo-avance + nunca tocar 'cancelled':
--   • target 'cancelled' conserva la semántica actual (any → cancelled)
--   • targets 'pending'/'confirmed'/'preparing'/'on-the-way' no mueven items:
--     los items viven en preparing+ y 'on-the-way' es tránsito de la orden
--     (así tampoco se crean items 'on-the-way', que el KDS no contempla)
-- Contraste documentado: complete_checkout/complete_order_checkout preservan
-- 'cancelled' y completan todo lo demás (mismo espíritu: no retroceder estados).

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

  UPDATE order_items
  SET status = p_target_status
  WHERE order_id = p_order_id
    AND status <> 'cancelled'
    AND CASE p_target_status
          WHEN 'cancelled' THEN TRUE
          WHEN 'ready' THEN status IN ('pending', 'confirmed', 'preparing')
          WHEN 'delivered' THEN status NOT IN ('delivered', 'completed')
          WHEN 'completed' THEN status <> 'completed'
          ELSE FALSE
        END;
END;
$function$;

-- ACL: el event trigger de Supabase regranta EXECUTE a anon/authenticated en
-- cada CREATE OR REPLACE (patrón V9-DB-04) — REVOKE explícito: solo service_role.
REVOKE EXECUTE ON FUNCTION public.transition_order(uuid, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, text, text, text) TO service_role, pg_database_owner;
