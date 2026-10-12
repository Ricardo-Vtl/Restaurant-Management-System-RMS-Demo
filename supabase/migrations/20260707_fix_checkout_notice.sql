-- P5c / V5-11: Add diagnostic notice to complete_checkout
-- RAISE NOTICE when called on a table without pending orders
CREATE OR REPLACE FUNCTION public.complete_checkout(p_table_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_rows INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  UPDATE orders
  SET payment_status = 'paid', status = 'completed'
  WHERE table_id = p_table_id AND payment_status = 'pending';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows = 0 THEN
    RAISE NOTICE 'complete_checkout called for table % without pending orders', p_table_id;
  END IF;

  UPDATE tables SET status = 'free', current_guests = 0 WHERE id = p_table_id;
END;
$function$;
