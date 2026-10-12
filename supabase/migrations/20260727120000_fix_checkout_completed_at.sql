-- Batch 6: Fix complete_checkout RPC to set completed_at timestamp
-- The RPC marks orders as 'completed' but never sets the completed_at column.
-- This ensures consistency with the PATCH /api/orders/status endpoint which auto-sets timestamps.

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
  SET payment_status = 'paid',
      status = 'completed',
      completed_at = NOW()
  WHERE table_id = p_table_id
    AND payment_status = 'pending';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows = 0 THEN
    RAISE NOTICE 'complete_checkout called for table % without pending orders', p_table_id;
  END IF;

  UPDATE tables SET status = 'free', current_guests = 0 WHERE id = p_table_id;
END;
$function$;
