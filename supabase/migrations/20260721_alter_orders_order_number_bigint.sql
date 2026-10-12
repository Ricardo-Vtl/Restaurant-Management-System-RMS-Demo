-- Change order_number from integer (int4) to bigint (int8)
-- Date.now() milliseconds (~1.78e12) exceeds int4 max (2.14e9),
-- causing INSERT failures when creating orders.

ALTER TABLE orders ALTER COLUMN order_number TYPE bigint;
