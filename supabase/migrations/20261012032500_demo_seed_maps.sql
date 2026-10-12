-- Demo seed (cont.) — mapa de ubicación en la landing.
-- El seed inicial (20261011230000) no incluyó maps_embed_url, y la sección
-- "Visítanos" oculta el iframe cuando el campo está vacío. Rellena solo si
-- está vacío (idempotente; no pisa un valor configurado desde la UI).
-- Embed genérico de Google Maps (Centro CDMX) acorde a la dirección del seed.
UPDATE public.restaurant_config
SET
  maps_embed_url = 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3762.1!2d-99.1438!3d19.4326!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses!2smx!4v1700000000000',
  updated_at = now()
WHERE maps_embed_url IS NULL OR maps_embed_url = '';
