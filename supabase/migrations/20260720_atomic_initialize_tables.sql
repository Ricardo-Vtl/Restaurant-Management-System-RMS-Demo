-- V7: Atomic table initialization — replaces INSERT + DELETE race condition
-- Fixes PENDIENTE-REVISION Quality #2 (useLocalSimulation.ts race condition)

CREATE OR REPLACE FUNCTION initialize_tables(p_tables_json jsonb)
RETURNS SETOF tables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  inserted_id uuid;
BEGIN
  -- Step 1: Soft-delete all active tables (atomic within this transaction)
  UPDATE tables SET is_active = false WHERE is_active = true;

  -- Step 2: Insert new tables one by one, returning each row
  FOR r IN SELECT * FROM jsonb_array_elements(p_tables_json)
  LOOP
    INSERT INTO tables (number, capacity, base_seats, status, section, is_active)
    VALUES (
      r->>'number',
      COALESCE((r->>'capacity')::int, 4),
      COALESCE((r->>'base_seats')::int, (r->>'capacity')::int, 4),
      COALESCE(r->>'status', 'free')::table_status,
      COALESCE(r->>'section', 'General'),
      true
    )
    RETURNING id INTO inserted_id;

    RETURN QUERY SELECT * FROM tables WHERE id = inserted_id;
  END LOOP;
END;
$$;

-- Access control: service_role only
REVOKE EXECUTE ON FUNCTION initialize_tables(jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION initialize_tables(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION initialize_tables(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION initialize_tables(jsonb) TO postgres;
