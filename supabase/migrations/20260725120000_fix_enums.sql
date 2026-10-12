-- Fix enums to match code expectations
-- payment_status: partial → partially_paid, add refunded
-- table_status: remove available/needs-attention/dirty, add closed

-- Drop indexes that reference enum columns
DROP INDEX IF EXISTS orders_payment_status_idx;
DROP INDEX IF EXISTS orders_table_pending_idx;
DROP INDEX IF EXISTS orders_status_idx;
DROP INDEX IF EXISTS orders_active_idx;
DROP INDEX IF EXISTS orders_status_created_idx;

-- Step 1: Change payment_status to VARCHAR, recreate enum, convert data

ALTER TABLE orders ALTER COLUMN payment_status DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN payment_status TYPE VARCHAR(50) USING payment_status::text;
ALTER TYPE payment_status RENAME TO payment_status_old;
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'partially_paid');

UPDATE orders SET payment_status = 'partially_paid' WHERE payment_status = 'partial';

ALTER TABLE orders ALTER COLUMN payment_status TYPE payment_status USING payment_status::payment_status;
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'pending'::payment_status;
DROP TYPE payment_status_old;

-- Step 2: Change table_status to VARCHAR, recreate enum, convert data

ALTER TABLE tables ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tables ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
ALTER TYPE table_status RENAME TO table_status_old;
CREATE TYPE table_status AS ENUM ('free', 'occupied', 'billing', 'reserved', 'closed');

UPDATE tables SET status = 'free' WHERE status IN ('available', 'dirty');
UPDATE tables SET status = 'occupied' WHERE status = 'needs-attention';

ALTER TABLE tables ALTER COLUMN status TYPE table_status USING status::table_status;
ALTER TABLE tables ALTER COLUMN status SET DEFAULT 'free'::table_status;
DROP TYPE table_status_old;

-- Recreate indexes (orders_waiter_idx already exists, skip it)
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_active_idx ON orders (created_at DESC) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX orders_payment_status_idx ON orders (payment_status);
CREATE INDEX orders_table_pending_idx ON orders (table_id, created_at DESC) WHERE payment_status = 'pending' AND status != 'cancelled';
