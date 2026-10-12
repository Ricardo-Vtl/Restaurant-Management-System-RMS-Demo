-- Módulo Staff: RPCs de gestión de personal (POST/PATCH /api/staff).
-- El PIN se hashea en BD con pgcrypto (extensions.crypt) — nunca viaja ni se
-- persiste en claro. Patrón endurecido V9-SEC-06: SET search_path = '' +
-- calificación completa. ACL: solo service_role (las rutas API validan rol admin).

-- Crea staff_users con PIN hasheado. Rechaza PIN duplicado entre staff activo
-- (el login get_staff_by_pin sería ambiguo ante dos filas con el mismo PIN).
CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_name text,
  p_role public.user_role,
  p_pin text,
  p_auth_id uuid,
  p_auth_email text
)
RETURNS TABLE(id uuid, name text, role public.user_role, is_active boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_pin !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'El PIN debe ser de 6 dígitos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_users s
    WHERE s.is_active = true AND s.pin = extensions.crypt(p_pin, s.pin)
  ) THEN
    RAISE EXCEPTION 'PIN ya en uso por otro miembro del personal';
  END IF;

  RETURN QUERY
  INSERT INTO public.staff_users (name, role, pin, auth_id, auth_email, is_active)
  VALUES (p_name, p_role, extensions.crypt(p_pin, extensions.gen_salt('bf')), p_auth_id, p_auth_email, true)
  RETURNING staff_users.id, staff_users.name, staff_users.role, staff_users.is_active, staff_users.created_at;
END;
$function$;

-- Re-hash de PIN (reset desde el módulo Personal). Misma guarda de duplicados,
-- excluyendo al propio staff. No-op si el PIN nuevo es idéntico al actual.
CREATE OR REPLACE FUNCTION public.set_staff_pin(p_staff_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_updated int;
BEGIN
  IF p_pin !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'El PIN debe ser de 6 dígitos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_users s
    WHERE s.id <> p_staff_id AND s.is_active = true AND s.pin = extensions.crypt(p_pin, s.pin)
  ) THEN
    RAISE EXCEPTION 'PIN ya en uso por otro miembro del personal';
  END IF;

  UPDATE public.staff_users
  SET pin = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  WHERE id = p_staff_id
    AND pin IS DISTINCT FROM extensions.crypt(p_pin, pin); -- no-op si no cambió

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 AND NOT EXISTS (SELECT 1 FROM public.staff_users WHERE id = p_staff_id) THEN
    RAISE EXCEPTION 'Personal no encontrado';
  END IF;
END;
$function$;

-- Solo service_role (+ owner). El event trigger de Supabase regranta EXECUTE a
-- anon/authenticated en cada CREATE; REVOKE explícito los cierra de nuevo.
REVOKE ALL ON FUNCTION public.create_staff_user(text, public.user_role, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_user(text, public.user_role, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text) TO service_role;
