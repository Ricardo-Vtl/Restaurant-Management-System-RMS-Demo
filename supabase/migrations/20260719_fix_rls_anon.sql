-- V6-12: Corregir — is_staff_authenticated debe ser ejecutable por todos los roles
-- para que RLS evalúe limpiamente (devuelve false para anon, no error de permisos).
-- Solo expone un boolean, no datos. El hardening real está en V6-1/V6-2 (RPCs con datos).

GRANT EXECUTE ON FUNCTION is_staff_authenticated() TO public;
