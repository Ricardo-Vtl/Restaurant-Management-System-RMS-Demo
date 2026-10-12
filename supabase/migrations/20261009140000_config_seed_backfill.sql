-- Módulo Config (F1c) — backfill de defaults operativos en la fila singleton.
--
-- La seed de 20261009120000 solo INSERTa si no existe fila (fail-safe). La BD
-- remota ya tenía una fila creada por el módulo Mesas (05 Ago) con datos reales
-- (total_mesas/total_sillas/sillas_respaldo) y los campos de identidad en su
-- default vacío → el landing perdería horarios/canales/ops al desplegar F4.
-- Este backfill rellena SOLO los defaults operativos aún vacíos. Identidad,
-- contacto y slides NO se tocan: white-label sin datos de ningún negocio (los
-- captura el negocio desde /gestion/config). Idempotente.

UPDATE public.restaurant_config
SET
  schedule = CASE WHEN schedule = '{}'::jsonb THEN
    '{
      "0": {"open": "11:00", "close": "21:00", "closed": false},
      "1": {"open": "11:00", "close": "21:00", "closed": false},
      "2": {"open": "11:00", "close": "21:00", "closed": false},
      "3": {"open": "11:00", "close": "21:00", "closed": false},
      "4": {"open": "11:00", "close": "21:00", "closed": false},
      "5": {"open": "11:00", "close": "21:00", "closed": false},
      "6": {"open": "11:00", "close": "21:00", "closed": false}
    }'::jsonb
  ELSE schedule END,
  channels = CASE WHEN channels = '{}'::jsonb THEN
    '{
      "delivery": {"enabled": true, "eta_text": "Entrega en 30-45 min", "min_order": 0, "fee": 0},
      "pickup":   {"enabled": true, "eta_text": "Listo en 20 min",     "min_order": 0, "fee": 0}
    }'::jsonb
  ELSE channels END,
  ops = CASE WHEN ops = '{}'::jsonb THEN
    '{"sla_green_min": 5, "sla_yellow_min": 15, "caja_window_hours": 48}'::jsonb
  ELSE ops END,
  updated_at = now();
