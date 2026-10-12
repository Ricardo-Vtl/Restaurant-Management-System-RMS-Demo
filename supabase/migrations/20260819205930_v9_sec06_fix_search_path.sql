-- V9-SEC-06: search_path mutable en 2 funciones SECURITY DEFINER sensibles.
-- Patrón: SET search_path = '' + referencias totalmente calificadas
-- (remediación oficial Supabase lint 0011_function_search_path_mutable).
-- get_staff_by_pin: califica public.staff_users y extensions.crypt (pgcrypto
--   vive en extensions, no en public). Es la que verifica PINs en el login.
-- is_staff_authenticated: el cuerpo ya estaba calificado (public.staff_users,
--   auth.uid()); solo se fija el search_path. Gobierna las 17 policies RLS.
-- CREATE OR REPLACE conserva las ACLs existentes (get_staff_by_pin sigue
--   restringida a service_role/pg_database_owner/postgres; is_staff_authenticated
--   conserva PUBLIC/authenticated, requeridos por la evaluación RLS).
CREATE OR REPLACE FUNCTION public.get_staff_by_pin(p_pin text)
RETURNS TABLE(id uuid, name text, role user_role, is_active boolean, auth_id uuid, auth_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
RETURN QUERY
SELECT s.id, s.name, s.role, s.is_active, s.auth_id, s.auth_email
FROM public.staff_users s
WHERE s.pin = extensions.crypt(p_pin, s.pin) AND s.is_active = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_staff_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE auth_id = auth.uid() AND is_active = true
  );
$function$;
