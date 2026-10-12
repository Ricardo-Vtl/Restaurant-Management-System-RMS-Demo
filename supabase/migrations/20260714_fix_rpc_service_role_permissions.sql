-- Fix: Grant RPC execution to service_role instead of postgres
-- supabaseAdmin uses SUPABASE_SERVICE_ROLE_KEY → service_role role
-- Previous migration incorrectly granted to postgres, breaking all RPC calls
-- from the admin client.

-- Fix update_table_distribution
REVOKE EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) FROM postgres;
GRANT EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) TO service_role;

-- Fix complete_checkout
REVOKE EXECUTE ON FUNCTION complete_checkout(UUID) FROM postgres;
GRANT EXECUTE ON FUNCTION complete_checkout(UUID) TO service_role;
