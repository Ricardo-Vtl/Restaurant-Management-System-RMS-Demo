-- V9-DB-04: Checkout integrity
-- 1) Persistir payment_method (enum ya existente: cash/card/transfer)
-- 2) complete_checkout ampliada: rechaza con items en cocina, cascada a
--    order_items, limpieza completa de mesa. Patrón endurecido V9-SEC-06
--    (SET search_path = '' + calificación completa).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method;

-- Firma nueva (uuid + payment_method); la anterior queda huérfana.
DROP FUNCTION IF EXISTS public.complete_checkout(uuid);

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
    RAISE EXCEPTION 'Hay % item(s) aun en cocina; entrega antes de cobrar', v_undelivered;
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

-- Solo service_role (+ owner). El event trigger de Supabase regranta EXECUTE
-- a anon/authenticated en cada CREATE; REVOKE explícito los cierra de nuevo.
REVOKE ALL ON FUNCTION public.complete_checkout(uuid, public.payment_method) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkout(uuid, public.payment_method) TO service_role;