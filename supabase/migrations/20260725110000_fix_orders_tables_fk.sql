-- Fix: Agregar FK constraint entre orders y tables
-- Esto permite a PostgREST hacer joins entre orders y tables
-- V9-DB-02 (Fase 4): guard idempotente — el init ya crea esta FK; ADD CONSTRAINT
-- no soporta IF NOT EXISTS, se guarda con chequeo de pg_constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_table_id_fkey' AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_table_id_fkey
      FOREIGN KEY (table_id) REFERENCES tables(id);
  END IF;
END $$;
