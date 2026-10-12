-- Modulo de Pedidos: agregar columnas a orders + indices
-- waiter_id, staff_id, customer_info, subtotal, tax, discount, notes,
-- accepted_at, ready_at, completed_at, cancelled_at, cancel_reason
-- V9-DB-02 (Fase 4): guard IF NOT EXISTS — el init (20260704000000) ya trae las
-- columnas en su estado final; sin guard el replay sobre BD inicializada falla.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_id uuid REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_info jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Indices
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_active_idx ON orders (created_at DESC) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status);
CREATE INDEX IF NOT EXISTS orders_table_pending_idx ON orders (table_id, created_at DESC) WHERE payment_status = 'pending' AND status != 'cancelled';
CREATE INDEX IF NOT EXISTS orders_waiter_idx ON orders (waiter_id) WHERE waiter_id IS NOT NULL;
