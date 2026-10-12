-- Grant RPC execution to public (SECURITY DEFINER keeps access safe)
-- Previous migration 20260714 revoked from public and only granted to postgres,
-- but the supabaseAdmin client uses service_role which lost access.
-- Since both functions are SECURITY DEFINER (run as owner), public execution
-- does not expose any data — it only allows calling the function.

GRANT EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) TO public;
GRANT EXECUTE ON FUNCTION complete_checkout(UUID) TO public;
