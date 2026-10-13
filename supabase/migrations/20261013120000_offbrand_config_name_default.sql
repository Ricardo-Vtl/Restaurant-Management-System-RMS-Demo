-- Off-branding: restaurar el DEFAULT generico de restaurant_config.name.
-- La columna se creo out-of-band con el nombre viejo del negocio como DEFAULT y
-- el ADD COLUMN IF NOT EXISTS de 20261009120000 fue no-op (la columna ya
-- existia), por lo que ese default sobrevivio en la BD viva (drift).
-- Idempotente: solo metadato, no toca datos ni reescribe la tabla.
ALTER TABLE public.restaurant_config ALTER COLUMN name SET DEFAULT 'La Buena Mesa';
