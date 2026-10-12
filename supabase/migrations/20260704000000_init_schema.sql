-- V9-DB-02 (Fase 4): esquema base como migración inicial.
-- Generado desde `supabase db dump --schema public` (BD remota dyzbgddcfflzhbugudyo,
-- 2026-08-28) y curado: prefijo de extensiones + apéndice de publication realtime.
-- Captura el ESTADO FINAL: 6 tablas, 6 enums, secuencia, índices, constraints,
-- 17 políticas RLS, grants/ACLs y 9 funciones (el orden pg_dump pone las funciones
-- ANTES de las políticas — is_staff_authenticated existe cuando las políticas se
-- crean — y los ALTER DEFAULT PRIVILEGES viajan en el cuerpo: son los que otorgan
-- EXECUTE a service_role en funciones recreadas por migraciones posteriores,
-- p. ej. get_staff_by_pin en 20260717).
-- NUNCA ejecutar contra la BD remota (los objetos existen) — se registra como
-- aplicada vía `supabase migration repair --status applied 20260704000000`.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'on-the-way',
    'delivered',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."order_type" AS ENUM (
    'dine-in',
    'delivery',
    'take-away',
    'pickup'
);


ALTER TYPE "public"."order_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'card',
    'transfer'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'paid',
    'refunded',
    'partially_paid'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."table_status" AS ENUM (
    'free',
    'occupied',
    'billing',
    'reserved',
    'closed'
);


ALTER TYPE "public"."table_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'waiter',
    'cashier',
    'kitchen',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_order_items"("p_order_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE orders
  SET total = COALESCE(total, 0) + (
    SELECT COALESCE(SUM((item->>'total_price')::numeric), 0)
    FROM jsonb_array_elements(p_items) AS item
  )
  WHERE id = p_order_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Orden % no encontrada', p_order_id;
  END IF;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, modifiers, status)
  SELECT
    p_order_id,
    (item->>'product_id')::uuid,
    (item->>'quantity')::int,
    (item->>'unit_price')::numeric,
    (item->>'total_price')::numeric,
    COALESCE(item->'modifiers', '{}'::jsonb),
    'preparing'
  FROM jsonb_array_elements(p_items) AS item;
END;
$$;


ALTER FUNCTION "public"."add_order_items"("p_order_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_order_items"("p_item_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order record;
BEGIN
  UPDATE order_items
  SET status = 'cancelled'
  WHERE id = ANY(p_item_ids)
    AND status NOT IN ('delivered', 'completed');

  FOR v_order IN
    SELECT DISTINCT order_id
    FROM order_items
    WHERE id = ANY(p_item_ids)
  LOOP
    UPDATE orders
    SET total = COALESCE((
      SELECT SUM(total_price)
      FROM order_items
      WHERE order_id = v_order.order_id
        AND status = 'delivered'
    ), 0)
    WHERE id = v_order.order_id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."cancel_order_items"("p_item_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_checkout"("p_table_id" "uuid", "p_payment_method" "public"."payment_method") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_order_ids uuid[];
  v_undelivered INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tables WHERE id = p_table_id) THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  SELECT array_agg(id) INTO v_order_ids
  FROM public.orders
  WHERE table_id = p_table_id
    AND payment_status = 'pending'
    AND status <> 'cancelled';

  IF v_order_ids IS NULL OR cardinality(v_order_ids) = 0 THEN
    RAISE EXCEPTION 'No hay ordenes pendientes de cobro en esta mesa';
  END IF;

  SELECT count(*) INTO v_undelivered
  FROM public.order_items
  WHERE order_id = ANY(v_order_ids)
    AND COALESCE(status, '') NOT IN ('delivered', 'completed', 'cancelled');

  IF v_undelivered > 0 THEN
    RAISE EXCEPTION 'Hay % item(s) aun en cocina; entrega antes de cobrar', v_undelivered;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'completed',
      completed_at = NOW(),
      payment_method = p_payment_method
  WHERE id = ANY(v_order_ids);

  UPDATE public.order_items
  SET status = 'completed'
  WHERE order_id = ANY(v_order_ids)
    AND COALESCE(status, '') <> 'cancelled';

  UPDATE public.tables
  SET status = 'free',
      current_guests = 0,
      "currentOrderId" = NULL,
      "totalCuenta" = 0
  WHERE id = p_table_id;
END;
$$;


ALTER FUNCTION "public"."complete_checkout"("p_table_id" "uuid", "p_payment_method" "public"."payment_method") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_staff_by_pin"("p_pin" "text") RETURNS TABLE("id" "uuid", "name" "text", "role" "public"."user_role", "is_active" boolean, "auth_id" "uuid", "auth_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
RETURN QUERY
SELECT s.id, s.name, s.role, s.is_active, s.auth_id, s.auth_email
FROM public.staff_users s
WHERE s.pin = extensions.crypt(p_pin, s.pin) AND s.is_active = true;
END;
$$;


ALTER FUNCTION "public"."get_staff_by_pin"("p_pin" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text" NOT NULL,
    "capacity" integer DEFAULT 4 NOT NULL,
    "current_guests" integer DEFAULT 0,
    "status" "public"."table_status" DEFAULT 'free'::"public"."table_status",
    "currentOrderId" "uuid",
    "section" "text",
    "isJoined" boolean DEFAULT false,
    "joinedTableIds" "uuid"[] DEFAULT '{}'::"uuid"[],
    "totalCuenta" numeric DEFAULT 0,
    "originalConfig" "jsonb",
    "position" "jsonb" DEFAULT '{"x": 0, "y": 0}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "base_seats" integer DEFAULT 4,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."tables" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_tables"("p_tables_json" "jsonb") RETURNS SETOF "public"."tables"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r jsonb;
  inserted_id uuid;
BEGIN
  -- Step 1: Soft-delete all active tables (atomic within this transaction)
  UPDATE tables SET is_active = false WHERE is_active = true;

  -- Step 2: Insert new tables one by one, returning each row
  FOR r IN SELECT * FROM jsonb_array_elements(p_tables_json)
  LOOP
    INSERT INTO tables (number, capacity, base_seats, status, section, is_active)
    VALUES (
      r->>'number',
      COALESCE((r->>'capacity')::int, 4),
      COALESCE((r->>'base_seats')::int, (r->>'capacity')::int, 4),
      COALESCE(r->>'status', 'free')::table_status,
      COALESCE(r->>'section', 'General'),
      true
    )
    RETURNING id INTO inserted_id;

    RETURN QUERY SELECT * FROM tables WHERE id = inserted_id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."initialize_tables"("p_tables_json" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff_authenticated"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE auth_id = auth.uid() AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_staff_authenticated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reopen_order"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE orders
  SET status = 'preparing',
      accepted_at = NULL
  WHERE id = p_order_id
    AND status IN ('delivered', 'completed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Orden % no reabrible: debe estar delivered o completed', p_order_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."reopen_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_order"("p_order_id" "uuid", "p_expected_status" "text", "p_target_status" "text", "p_cancel_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE orders
  SET status = p_target_status,
      accepted_at = CASE WHEN p_target_status = 'confirmed' THEN COALESCE(accepted_at, NOW()) ELSE accepted_at END,
      ready_at = CASE WHEN p_target_status = 'ready' THEN NOW() ELSE ready_at END,
      completed_at = CASE WHEN p_target_status = 'completed' THEN NOW() ELSE completed_at END,
      cancelled_at = CASE WHEN p_target_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
      cancel_reason = CASE WHEN p_target_status = 'cancelled' THEN p_cancel_reason ELSE cancel_reason END
  WHERE id = p_order_id
    AND status = p_expected_status;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Orden % no encontrada o estado actual distinto de %', p_order_id, p_expected_status;
  END IF;

  UPDATE order_items SET status = p_target_status WHERE order_id = p_order_id;
END;
$$;


ALTER FUNCTION "public"."transition_order"("p_order_id" "uuid", "p_expected_status" "text", "p_target_status" "text", "p_cancel_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_table_distribution"("p_table_id" "uuid", "p_capacity" integer, "p_current_guests" integer, "p_section" "text", "p_cascade_ids" "uuid"[], "p_cascade_capacities" integer[], "p_cascade_is_active" boolean[], "p_config_id" "uuid", "p_sillas_respaldo" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  i INT;
BEGIN
  UPDATE tables
  SET capacity = p_capacity,
      current_guests = p_current_guests,
      section = p_section
  WHERE id = p_table_id;

  IF array_length(p_cascade_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_cascade_ids, 1) LOOP
      UPDATE tables
      SET capacity = p_cascade_capacities[i],
          is_active = p_cascade_is_active[i]
      WHERE id = p_cascade_ids[i];
    END LOOP;
  END IF;

  IF p_config_id IS NOT NULL THEN
    UPDATE restaurant_config
    SET sillas_respaldo = p_sillas_respaldo
    WHERE id = p_config_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_table_distribution"("p_table_id" "uuid", "p_capacity" integer, "p_current_guests" integer, "p_section" "text", "p_cascade_ids" "uuid"[], "p_cascade_capacities" integer[], "p_cascade_is_active" boolean[], "p_config_id" "uuid", "p_sillas_respaldo" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "quantity" integer NOT NULL,
    "unit_price" numeric NOT NULL,
    "total_price" numeric NOT NULL,
    "modifiers" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" >= 0)),
    CONSTRAINT "order_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'preparing'::"text", 'ready'::"text", 'on-the-way'::"text", 'delivered'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "order_items_total_price_check" CHECK (("total_price" >= (0)::numeric)),
    CONSTRAINT "order_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" bigint NOT NULL,
    "table_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "total" numeric DEFAULT 0,
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "type" "text" DEFAULT 'dine-in'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "waiter_id" "uuid",
    "staff_id" "uuid",
    "customer_info" "jsonb",
    "subtotal" numeric(10,2) DEFAULT 0,
    "tax" numeric(10,2) DEFAULT 0,
    "discount" numeric(10,2) DEFAULT 0,
    "notes" "text",
    "accepted_at" timestamp with time zone,
    "ready_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancel_reason" "text",
    "payment_method" "public"."payment_method",
    CONSTRAINT "orders_discount_check" CHECK (("discount" >= (0)::numeric)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'preparing'::"text", 'ready'::"text", 'on-the-way'::"text", 'delivered'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_tax_check" CHECK (("tax" >= (0)::numeric)),
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "orders_type_check" CHECK (("type" = ANY (ARRAY['dine-in'::"text", 'delivery'::"text", 'take-away'::"text", 'pickup'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."orders_order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."orders_order_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."orders_order_number_seq" OWNED BY "public"."orders"."order_number";



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "basePrice" numeric NOT NULL,
    "category" "text" NOT NULL,
    "image" "text",
    "available" boolean DEFAULT true,
    "preparationTime" integer,
    "hasSizes" boolean DEFAULT false,
    "sizes" "jsonb" DEFAULT '[]'::"jsonb",
    "hasSauces" boolean DEFAULT false,
    "sauces" "jsonb" DEFAULT '[]'::"jsonb",
    "hasExtras" boolean DEFAULT false,
    "extras" "jsonb" DEFAULT '[]'::"jsonb",
    "hasSpiceLevel" boolean DEFAULT false,
    "spiceLevels" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurant_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "total_mesas" integer DEFAULT 8 NOT NULL,
    "total_sillas" integer DEFAULT 36 NOT NULL,
    "sillas_respaldo" integer DEFAULT 4 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."restaurant_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "pin" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'waiter'::"public"."user_role" NOT NULL,
    "avatar_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "auth_id" "uuid",
    "auth_email" "text"
);


ALTER TABLE "public"."staff_users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."orders" ALTER COLUMN "order_number" SET DEFAULT "nextval"('"public"."orders_order_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_unique" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurant_config"
    ADD CONSTRAINT "restaurant_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_auth_email_key" UNIQUE ("auth_email");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_staff_users_auth_id" ON "public"."staff_users" USING "btree" ("auth_id");



CREATE INDEX "order_items_order_id_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_items_product_id_idx" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "orders_active_idx" ON "public"."orders" USING "btree" ("created_at" DESC) WHERE ("status" <> ALL (ARRAY['completed'::"text", 'cancelled'::"text"]));



CREATE INDEX "orders_payment_status_idx" ON "public"."orders" USING "btree" ("payment_status");



CREATE INDEX "orders_staff_id_idx" ON "public"."orders" USING "btree" ("staff_id");



CREATE INDEX "orders_status_created_idx" ON "public"."orders" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "orders_status_idx" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "orders_table_pending_idx" ON "public"."orders" USING "btree" ("table_id", "created_at" DESC) WHERE (("payment_status" = 'pending'::"public"."payment_status") AND ("status" <> 'cancelled'::"text"));



CREATE INDEX "orders_waiter_idx" ON "public"."orders" USING "btree" ("waiter_id") WHERE ("waiter_id" IS NOT NULL);



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "public"."staff_users"("id");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Enable users to view their own data only" ON "public"."staff_users" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "auth_id"));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_insert" ON "public"."order_items" FOR INSERT WITH CHECK ("public"."is_staff_authenticated"());



CREATE POLICY "order_items_select" ON "public"."order_items" FOR SELECT USING ("public"."is_staff_authenticated"());



CREATE POLICY "order_items_update" ON "public"."order_items" FOR UPDATE USING ("public"."is_staff_authenticated"());



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert" ON "public"."orders" FOR INSERT WITH CHECK ("public"."is_staff_authenticated"());



CREATE POLICY "orders_select" ON "public"."orders" FOR SELECT USING ("public"."is_staff_authenticated"());



CREATE POLICY "orders_update" ON "public"."orders" FOR UPDATE USING ("public"."is_staff_authenticated"());



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_insert" ON "public"."products" FOR INSERT WITH CHECK ("public"."is_staff_authenticated"());



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING ("public"."is_staff_authenticated"());



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING ("public"."is_staff_authenticated"());



ALTER TABLE "public"."restaurant_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "restaurant_config_insert" ON "public"."restaurant_config" FOR INSERT WITH CHECK ("public"."is_staff_authenticated"());



CREATE POLICY "restaurant_config_select" ON "public"."restaurant_config" FOR SELECT USING ("public"."is_staff_authenticated"());



CREATE POLICY "restaurant_config_update" ON "public"."restaurant_config" FOR UPDATE USING ("public"."is_staff_authenticated"());



ALTER TABLE "public"."staff_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tables_delete" ON "public"."tables" FOR DELETE USING ("public"."is_staff_authenticated"());



CREATE POLICY "tables_insert" ON "public"."tables" FOR INSERT WITH CHECK ("public"."is_staff_authenticated"());



CREATE POLICY "tables_select" ON "public"."tables" FOR SELECT USING ("public"."is_staff_authenticated"());



CREATE POLICY "tables_update" ON "public"."tables" FOR UPDATE USING ("public"."is_staff_authenticated"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_order_items"("p_order_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_order_items"("p_order_id" "uuid", "p_items" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."add_order_items"("p_order_id" "uuid", "p_items" "jsonb") TO "pg_database_owner";



REVOKE ALL ON FUNCTION "public"."cancel_order_items"("p_item_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_order_items"("p_item_ids" "uuid"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."cancel_order_items"("p_item_ids" "uuid"[]) TO "pg_database_owner";



REVOKE ALL ON FUNCTION "public"."complete_checkout"("p_table_id" "uuid", "p_payment_method" "public"."payment_method") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_checkout"("p_table_id" "uuid", "p_payment_method" "public"."payment_method") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_staff_by_pin"("p_pin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_staff_by_pin"("p_pin" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_staff_by_pin"("p_pin" "text") TO "pg_database_owner";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tables" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tables" TO "authenticated";
GRANT ALL ON TABLE "public"."tables" TO "service_role";



REVOKE ALL ON FUNCTION "public"."initialize_tables"("p_tables_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."initialize_tables"("p_tables_json" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_staff_authenticated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff_authenticated"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reopen_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reopen_order"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."reopen_order"("p_order_id" "uuid") TO "pg_database_owner";



REVOKE ALL ON FUNCTION "public"."transition_order"("p_order_id" "uuid", "p_expected_status" "text", "p_target_status" "text", "p_cancel_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_order"("p_order_id" "uuid", "p_expected_status" "text", "p_target_status" "text", "p_cancel_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."transition_order"("p_order_id" "uuid", "p_expected_status" "text", "p_target_status" "text", "p_cancel_reason" "text") TO "pg_database_owner";



REVOKE ALL ON FUNCTION "public"."update_table_distribution"("p_table_id" "uuid", "p_capacity" integer, "p_current_guests" integer, "p_section" "text", "p_cascade_ids" "uuid"[], "p_cascade_capacities" integer[], "p_cascade_is_active" boolean[], "p_config_id" "uuid", "p_sillas_respaldo" integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."update_table_distribution"("p_table_id" "uuid", "p_capacity" integer, "p_current_guests" integer, "p_section" "text", "p_cascade_ids" "uuid"[], "p_cascade_capacities" integer[], "p_cascade_is_active" boolean[], "p_config_id" "uuid", "p_sillas_respaldo" integer) FROM "postgres";
GRANT ALL ON FUNCTION "public"."update_table_distribution"("p_table_id" "uuid", "p_capacity" integer, "p_current_guests" integer, "p_section" "text", "p_cascade_ids" "uuid"[], "p_cascade_capacities" integer[], "p_cascade_is_active" boolean[], "p_config_id" "uuid", "p_sillas_respaldo" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_table_distribution"("p_table_id" "uuid", "p_capacity" integer, "p_current_guests" integer, "p_section" "text", "p_cascade_ids" "uuid"[], "p_cascade_capacities" integer[], "p_cascade_is_active" boolean[], "p_config_id" "uuid", "p_sillas_respaldo" integer) TO "pg_database_owner";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_order_number_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."restaurant_config" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."restaurant_config" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_config" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."staff_users" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."staff_users" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- V9-DB-02 (Fase 4): realtime no sale del dump (las publications no tienen schema
-- y pg_dump --schema las excluye) — reproducción explícita de la configuración viva.
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
