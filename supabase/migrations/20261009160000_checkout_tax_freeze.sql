-- Módulo Config (F5) — desglose de impuestos al cobrar.
--
-- Precios con impuesto incluido (§5 del plan): el total no cambia; al cobrar se
-- congela el monto del impuesto en orders.tax = round(total - total/(1+tasa), 2)
-- para que cambiar tax_rate no retroactúe sobre órdenes pasadas.
-- Si tax_enabled = false (default) → tax = 0, cero cambio de comportamiento.
--
-- Ambas funciones conservan su firma y su lógica de negocio (exigen items
-- entregados, cascada a completed, liberan mesa). ACL re-aplicada tras cada
-- CREATE (patrón V9-DB-04).

CREATE OR REPLACE FUNCTION public.complete_checkout(p_table_id uuid, p_payment_method public.payment_method)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_order_ids uuid[];
  v_undelivered INT;
  v_tax_enabled boolean;
  v_tax_rate numeric;
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

  SELECT tax_enabled, tax_rate INTO v_tax_enabled, v_tax_rate
  FROM public.restaurant_config
  LIMIT 1;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'completed',
      completed_at = NOW(),
      payment_method = p_payment_method,
      tax = CASE
        WHEN v_tax_enabled AND v_tax_rate IS NOT NULL AND v_tax_rate > 0
        THEN round(total - total / (1 + v_tax_rate), 2)
        ELSE 0
      END
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
  v_tax_enabled boolean;
  v_tax_rate numeric;
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

  SELECT tax_enabled, tax_rate INTO v_tax_enabled, v_tax_rate
  FROM public.restaurant_config
  LIMIT 1;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'completed',
      completed_at = NOW(),
      payment_method = p_payment_method,
      tax = CASE
        WHEN v_tax_enabled AND v_tax_rate IS NOT NULL AND v_tax_rate > 0
        THEN round(total - total / (1 + v_tax_rate), 2)
        ELSE 0
      END
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

-- ACL explícita post-CREATE (patrón V9-DB-04)
REVOKE ALL ON FUNCTION public.complete_checkout(uuid, public.payment_method) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.complete_checkout(uuid, public.payment_method) TO service_role;

REVOKE ALL ON FUNCTION public.complete_order_checkout(uuid, public.payment_method) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_order_checkout(uuid, public.payment_method) TO service_role;
