-- P4b / V4-5: Atomic RPC functions to replace Promise.all multi-PATCH patterns
-- Prevents partial failures in table redistribution and checkout flows.

-- ── Function 1: Checkout atomic (mark orders paid + free table) ──
CREATE OR REPLACE FUNCTION complete_checkout(p_table_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  UPDATE orders
  SET payment_status = 'paid',
      status = 'completed'
  WHERE table_id = p_table_id
    AND payment_status = 'pending';

  UPDATE tables
  SET status = 'free',
      current_guests = 0
  WHERE id = p_table_id;
END;
$$;

-- ── Function 2: Table distribution atomic (batch update tables + config) ──
CREATE OR REPLACE FUNCTION update_table_distribution(
  p_table_id UUID,
  p_capacity INT,
  p_current_guests INT,
  p_section TEXT,
  p_cascade_ids UUID[],
  p_cascade_capacities INT[],
  p_cascade_is_active BOOLEAN[],
  p_config_id UUID,
  p_sillas_respaldo INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INT;
BEGIN
  UPDATE tables
  SET capacity = p_capacity,
      current_guests = p_current_guests,
      section = p_section
  WHERE id = p_table_id;

  IF array_length(p_cascade_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_cascade_ids, 1) LOOP
      UPDATE tables
      SET capacity = p_cascade_capacities[i],
          is_active = p_cascade_is_active[i]
      WHERE id = p_cascade_ids[i];
    END LOOP;
  END IF;

  IF p_config_id IS NOT NULL THEN
    UPDATE restaurant_config
    SET sillas_respaldo = p_sillas_respaldo
    WHERE id = p_config_id;
  END IF;
END;
$$;

-- ── Access Control: Restrict execution to service_role only ──
-- Revoke default public execute permission
REVOKE EXECUTE ON FUNCTION complete_checkout(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) FROM public;

-- Explicitly grant to service_role (postgres owner)
GRANT EXECUTE ON FUNCTION complete_checkout(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) TO postgres;

-- Explicitly deny to authenticated and anon roles
REVOKE EXECUTE ON FUNCTION complete_checkout(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION complete_checkout(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) FROM anon;
