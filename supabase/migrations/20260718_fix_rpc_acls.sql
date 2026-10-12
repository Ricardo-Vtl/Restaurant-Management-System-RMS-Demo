-- Fix V6-2 y V6-6: Revocar explícitamente anon y authenticated
-- La migración 20260717 hizo REVOKE FROM public pero los ACLs heredados persisten

REVOKE EXECUTE ON FUNCTION complete_checkout(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_checkout(UUID) TO pg_database_owner;

REVOKE EXECUTE ON FUNCTION is_staff_authenticated() FROM public, anon;
GRANT EXECUTE ON FUNCTION is_staff_authenticated() TO authenticated;
