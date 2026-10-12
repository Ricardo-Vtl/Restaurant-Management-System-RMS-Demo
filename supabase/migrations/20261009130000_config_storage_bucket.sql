-- Módulo Config (F1b) — bucket de Storage para assets del restaurante
-- (logo + slides del hero). Público para lectura (URL /object/public/...);
-- la escritura es solo vía API con service role (V9-SEC-01).
-- Límites también en el bucket (defense in depth con la validación del upload):
-- máx. 3 MB (el límite de logo de 1 MB lo aplica la ruta) y solo imágenes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('restaurant-assets', 'restaurant-assets', true, 3145728, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
