-- V9-DB-02: regularizar enum payment_method aplicado fuera de banda.
-- El tipo ya existe en la BD viva (cash/card/transfer) pero ninguna migración
-- lo creaba -> un reset/branch fresco fallaba con "type payment_method does not
-- exist" (referenciado por 20260821181019_v9_db04_checkout_integrity).
-- Idempotente: no-op si ya existe. Registrada como aplicada en el ledger remoto.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_method'
  ) THEN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer');
  END IF;
END $$;
