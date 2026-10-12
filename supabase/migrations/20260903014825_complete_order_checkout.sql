-- Módulo Caja: cobro por orden individual (además del existente por mesa).
-- complete_order_checkout replica la lógica atómica de complete_checkout para
-- una sola orden: valida items entregados, marca orden + items completados,
-- libera la mesa si no le quedan otras órdenes pendientes.

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
    RAISE EXCEPTION 'Hay % item(s) aun en cocina; entrega antes de cobrar', v_undelivered;
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

-- Solo service_role (+ owner). El event trigger de Supabase regranta EXECUTE a
-- anon/authenticated en cada CREATE; REVOKE explícito los cierra de nuevo.
REVOKE ALL ON FUNCTION public.complete_order_checkout(uuid, public.payment_method) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_order_checkout(uuid, public.payment_method) TO service_role;
