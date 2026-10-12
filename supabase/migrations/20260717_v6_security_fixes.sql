-- V6-1, V6-2, V6-6: Revocar EXECUTE público de RPCs sensibles
-- V6-8: Email no determinista para auth

-- V6-2: update_table_distribution y complete_checkout — revocar GRANT a public
-- La migración 20260716 las otorgó a public por error; se revierte.
REVOKE EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) FROM public;
REVOKE EXECUTE ON FUNCTION complete_checkout(UUID) FROM public;
GRANT EXECUTE ON FUNCTION update_table_distribution(UUID, INT, INT, TEXT, UUID[], INT[], BOOLEAN[], UUID, INT) TO pg_database_owner;
GRANT EXECUTE ON FUNCTION complete_checkout(UUID) TO pg_database_owner;

-- V6-6: is_staff_authenticated — revocar de public pero mantener para authenticated (RLS)
REVOKE EXECUTE ON FUNCTION is_staff_authenticated() FROM public;
GRANT EXECUTE ON FUNCTION is_staff_authenticated() TO authenticated;

-- V6-8: Agregar auth_email no determinista a staff_users
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS auth_email TEXT UNIQUE;

-- Asignar emails únicos con gen_random_uuid() a staff existentes que no tengan uno
UPDATE staff_users
SET auth_email = 'staff-' || gen_random_uuid() || '@staff.internal'
WHERE auth_email IS NULL;

-- V6-8 + V6-1: Recrear get_staff_by_pin con auth_email + restringir ejecución
-- Necesita DROP porque CREATE OR REPLACE no permite cambiar el return type
DROP FUNCTION IF EXISTS public.get_staff_by_pin(TEXT);
CREATE FUNCTION public.get_staff_by_pin(p_pin text)
RETURNS TABLE(id uuid, name text, role user_role, is_active boolean, auth_id uuid, auth_email text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
RETURN QUERY
SELECT s.id, s.name, s.role, s.is_active, s.auth_id, s.auth_email
FROM staff_users s
WHERE s.pin = crypt(p_pin, s.pin) AND s.is_active = true;
END;
$function$;

-- V6-1: Restringir get_staff_by_pin a pg_database_owner (post-recreate)
REVOKE EXECUTE ON FUNCTION get_staff_by_pin(TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_pin(TEXT) TO pg_database_owner;
