


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



CREATE OR REPLACE FUNCTION "public"."add_low_stock_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_product products%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_new_qty numeric;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = NEW.product_id;
  v_new_qty := v_product.qty + NEW.qty_change;
  
  IF NEW.type = 'out' AND v_new_qty <= v_product.reorder_point THEN
    SELECT * INTO v_org FROM organizations WHERE id = v_product.org_id;
    IF v_org.whatsapp_number IS NOT NULL AND v_org.whatsapp_number != '' THEN
      INSERT INTO whatsapp_logs (org_id, phone, message, status)
      VALUES (
        v_product.org_id,
        v_org.whatsapp_number,
        '⚠️ *تنبيه نقص مخزون — ' || v_org.name || '*' || chr(10) || chr(10) ||
        'المنتج: ' || v_product.name || chr(10) ||
        'الكمية المتبقية: ' || v_new_qty || ' ' || v_product.unit || chr(10) ||
        'الحد الأدنى: ' || v_product.reorder_point || chr(10) || chr(10) ||
        '⚡ يرجى إعادة الطلب في أقرب وقت' || chr(10) ||
        '_Storely — نظام إدارة المخزون_',
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_low_stock_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_auth_identity"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM auth.identities WHERE id = user_id::text OR user_id = user_id;
END;
$$;


ALTER FUNCTION "public"."delete_auth_identity"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_auth_user"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."delete_auth_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select org_id from profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."my_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_low_stock_on_dispense"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_product products%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_new_qty numeric;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = NEW.product_id;
  v_new_qty := v_product.qty + NEW.qty_change;
  
  IF NEW.type = 'out' AND v_new_qty <= v_product.reorder_point THEN
    SELECT * INTO v_org FROM organizations WHERE id = v_product.org_id;
    INSERT INTO whatsapp_logs (org_id, phone, message, status)
    VALUES (
      v_product.org_id,
      v_org.whatsapp_number,
      '⚠️ *تنبيه نقص مخزون — ' || v_org.name || '*' || chr(10) || chr(10) ||
      'المنتج: ' || v_product.name || chr(10) ||
      'الكمية المتبقية: ' || v_new_qty || ' ' || v_product.unit || chr(10) ||
      'الحد الأدنى: ' || v_product.reorder_point || chr(10) || chr(10) ||
      '⚡ يرجى إعادة الطلب في أقرب وقت' || chr(10) ||
      '_Storely — نظام إدارة المخزون_',
      'pending'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_low_stock_on_dispense"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_product_qty"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update products
  set qty = (
    select coalesce(sum(qty_change), 0)
    from stock_movements
    where product_id = new.product_id
  )
  where id = new.product_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_product_qty"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "admin_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "target_org_id" "uuid",
    "target_org_name" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "target_orgs" "uuid"[],
    "sent_to_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."admin_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "size_kb" integer DEFAULT 0,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "text" DEFAULT 'system'::"text"
);


ALTER TABLE "public"."backups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "location" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "whatsapp_number" "text"
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cashier_closings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "staff_id" "uuid",
    "staff_name" "text" NOT NULL,
    "closing_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "total_sales" numeric(12,2) DEFAULT 0 NOT NULL,
    "network_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "cash_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "purchases" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_purchases" numeric(12,2) DEFAULT 0 NOT NULL,
    "expected_cash" numeric(12,2) DEFAULT 0 NOT NULL,
    "difference" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'balanced'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "network_image" "text",
    "sales_image" "text",
    "mada_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "visa_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "mastercard_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "closing_time" time without time zone,
    CONSTRAINT "cashier_closings_status_check" CHECK (("status" = ANY (ARRAY['deficit'::"text", 'surplus'::"text", 'balanced'::"text"])))
);


ALTER TABLE "public"."cashier_closings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "terms_version" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consent_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_backups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "backup_date" "date" NOT NULL,
    "products_data" "jsonb",
    "purchases_data" "jsonb",
    "movements_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_backups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."demo_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "business_name" "text" NOT NULL,
    "branch_count" "text",
    "status" "text" DEFAULT 'new'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "matched_org_id" "uuid"
);


ALTER TABLE "public"."demo_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "type" "text" DEFAULT 'modal'::"text",
    "page" "text",
    "icon" "text" DEFAULT '✨'::"text",
    "color" "text" DEFAULT '#16a34a'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "target_orgs" "uuid"[] DEFAULT '{}'::"uuid"[]
);


ALTER TABLE "public"."feature_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fixed_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fixed_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."health_check_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "issues_count" integer DEFAULT 0 NOT NULL,
    "issues" "jsonb",
    "checked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."health_check_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "total_value" numeric(14,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "products_data" "jsonb" DEFAULT '[]'::"jsonb",
    "total_products" integer DEFAULT 0,
    "low_stock_count" integer DEFAULT 0
);


ALTER TABLE "public"."inventory_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."landing_partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."landing_partners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_fixed_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "month" "date" NOT NULL,
    "fixed_expense_id" "uuid",
    "name" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."monthly_fixed_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "branch_id" "uuid",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'warning'::"text", 'danger'::"text", 'success'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "whatsapp_number" "text" NOT NULL,
    "low_stock_threshold" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notify_schedule" "text" DEFAULT 'daily'::"text",
    "notify_time" "text" DEFAULT '08:00'::"text",
    "notify_days" "text"[] DEFAULT ARRAY['0'::"text"],
    "last_notified_at" timestamp with time zone,
    "last_backup_at" timestamp with time zone,
    "max_branches" integer DEFAULT 1,
    "business_type" "text" DEFAULT 'مطعم'::"text",
    "onboarding_done" boolean DEFAULT false,
    "plan" "text" DEFAULT 'basic'::"text",
    "max_staff" integer DEFAULT 1,
    "max_suppliers" integer DEFAULT 1,
    "requested_plan" "text" DEFAULT 'basic'::"text",
    "supplier_notify_mode" "text" DEFAULT 'daily'::"text",
    "supplier_notify_time" "text" DEFAULT '08:00'::"text",
    "supplier_notify_day" integer DEFAULT 0,
    "logo_url" "text",
    "subscription_ends_at" timestamp with time zone,
    "country_code" "text" DEFAULT '+966'::"text",
    "shop_open_time" time without time zone,
    "shop_close_time" time without time zone,
    "notify_low_stock_wa" boolean DEFAULT true,
    "notify_cashier_closing_wa" boolean DEFAULT true,
    "notify_supplier_wa" boolean DEFAULT true,
    "digest_mode" boolean DEFAULT false,
    "digest_time" "text" DEFAULT '21:00'::"text",
    "deletion_scheduled_at" timestamp with time zone,
    "currency" "text" DEFAULT 'SAR'::"text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "terms_version" "text" DEFAULT '2026-06-b'::"text" NOT NULL,
    "maintenance_mode" boolean DEFAULT false NOT NULL,
    "maintenance_message" "text" DEFAULT 'الموقع بصيانة مؤقتة، بنرجع قريباً 🛠️'::"text",
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_messages" (
    "message_id" character varying(200) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."processed_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL,
    "reorder_point" numeric,
    "order_qty" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sku" "text",
    "unit" "text" DEFAULT 'قطعة'::"text" NOT NULL,
    "qty" integer DEFAULT 0 NOT NULL,
    "reorder_point" integer DEFAULT 5 NOT NULL,
    "category" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "branch_id" "uuid",
    "supplier_id" "uuid",
    "supplier_reorder_point" numeric,
    "supplier_order_qty" numeric DEFAULT 0,
    "translations" "jsonb" DEFAULT '{}'::"jsonb",
    "supplier_notes" "text",
    "avg_cost" numeric(12,4) DEFAULT 0 NOT NULL,
    "backup_supplier_id" "uuid",
    "expiry_date" "date",
    CONSTRAINT "products_qty_check" CHECK (("qty" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid",
    "full_name" "text" NOT NULL,
    "phone" "text",
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "subscription_type" "text" DEFAULT 'trial'::"text",
    "subscription_ends_at" timestamp with time zone,
    "branch_id" "uuid",
    "branch_count" integer DEFAULT 1,
    "seen_welcome" boolean DEFAULT false,
    "whatsapp_consent" boolean DEFAULT false,
    "whatsapp_consent_at" timestamp with time zone,
    "terms_accepted_at" timestamp with time zone,
    "terms_version_accepted" "text",
    "whatsapp_first_contact_confirmed" boolean DEFAULT false,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'suspended'::"text", 'deleted'::"text"]))),
    CONSTRAINT "profiles_subscription_type_check" CHECK (("subscription_type" = ANY (ARRAY['trial'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "qty" integer,
    "unit" "text",
    "reorder_point" integer DEFAULT 5,
    "amount" numeric(10,2) NOT NULL,
    "vat_amount" numeric(10,2) GENERATED ALWAYS AS ("round"(("amount" * 0.15), 2)) STORED,
    "total_amount" numeric(10,2) GENERATED ALWAYS AS ("round"(("amount" * 1.15), 2)) STORED,
    "supplier" "text",
    "note" "text",
    "invoice_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_image" "text",
    "branch_id" "uuid",
    CONSTRAINT "purchases_category_check" CHECK (("category" = ANY (ARRAY['مخزون'::"text", 'صيانة'::"text", 'مشتريات'::"text", 'أخرى'::"text"])))
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid",
    "subscription" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "pin" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "assigned_products" "uuid"[] DEFAULT '{}'::"uuid"[],
    "permissions" "jsonb" DEFAULT '{"reports": false, "dispense": true, "inventory": false, "purchases": false}'::"jsonb",
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "send_closing_whatsapp" boolean DEFAULT true,
    CONSTRAINT "staff_members_role_check" CHECK (("role" = ANY (ARRAY['staff'::"text", 'cashier'::"text"])))
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "type" "text" NOT NULL,
    "qty_change" integer NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "branch_id" "uuid",
    "staff_id" "uuid",
    "waste_reason" "text",
    CONSTRAINT "stock_movements_type_check" CHECK (("type" = ANY (ARRAY['in'::"text", 'out'::"text", 'adjustment'::"text", 'waste'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "plan" "text",
    "amount" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['trial_started'::"text", 'activated'::"text", 'cancelled'::"text", 'upgraded'::"text", 'downgraded'::"text", 'renewed'::"text"])))
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_applications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_name" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "business_type" "text"[],
    "description" "text",
    "website" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "whatsapp" "text",
    "offer" "text",
    "logo_url" "text",
    "marketplace_consent" boolean DEFAULT false
);


ALTER TABLE "public"."supplier_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_order_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "supplier_id" "uuid",
    "qty_at_trigger" numeric,
    "status" "text" DEFAULT 'sent'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "wa_msg_id" "text"
);


ALTER TABLE "public"."supplier_order_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "supplier_id" "uuid",
    "supplier_name" "text",
    "supplier_phone" "text",
    "items" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text"),
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "product_id" "uuid",
    "escalated_from" "uuid",
    "escalated_at" timestamp with time zone,
    "current_priority" integer DEFAULT 1,
    "branch_id" "uuid"
);


ALTER TABLE "public"."supplier_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_performance_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "event_type" "text" NOT NULL,
    "response_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_performance_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "notify_mode" "text" DEFAULT 'daily'::"text",
    "notify_time" "text" DEFAULT '08:00'::"text",
    "notify_day" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "response_timeout_hours" integer DEFAULT 24,
    "branch_id" "uuid",
    "whatsapp_consent" boolean DEFAULT false,
    "whatsapp_consent_at" timestamp with time zone
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_seen_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "feature_version" "text" NOT NULL,
    "seen_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_seen_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "phone" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."whatsapp_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_sessions" (
    "phone" "text" NOT NULL,
    "state" "text" DEFAULT 'main'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "otp_code" "text",
    "otp_expires_at" timestamp with time zone,
    "selected_branch_id" "uuid"
);


ALTER TABLE "public"."whatsapp_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backups"
    ADD CONSTRAINT "backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cashier_closings"
    ADD CONSTRAINT "cashier_closings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consent_logs"
    ADD CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_backups"
    ADD CONSTRAINT "data_backups_org_id_backup_date_key" UNIQUE ("org_id", "backup_date");



ALTER TABLE ONLY "public"."data_backups"
    ADD CONSTRAINT "data_backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demo_requests"
    ADD CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_announcements"
    ADD CONSTRAINT "feature_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_announcements"
    ADD CONSTRAINT "feature_announcements_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."health_check_logs"
    ADD CONSTRAINT "health_check_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_org_id_snapshot_date_key" UNIQUE ("org_id", "snapshot_date");



ALTER TABLE ONLY "public"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_partners"
    ADD CONSTRAINT "landing_partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_fixed_expenses"
    ADD CONSTRAINT "monthly_fixed_expenses_org_id_month_fixed_expense_id_key" UNIQUE ("org_id", "month", "fixed_expense_id");



ALTER TABLE ONLY "public"."monthly_fixed_expenses"
    ADD CONSTRAINT "monthly_fixed_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_messages"
    ADD CONSTRAINT "processed_messages_pkey" PRIMARY KEY ("message_id");



ALTER TABLE ONLY "public"."product_suppliers"
    ADD CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_suppliers"
    ADD CONSTRAINT "product_suppliers_product_id_priority_key" UNIQUE ("product_id", "priority");



ALTER TABLE ONLY "public"."product_suppliers"
    ADD CONSTRAINT "product_suppliers_product_id_supplier_id_key" UNIQUE ("product_id", "supplier_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_applications"
    ADD CONSTRAINT "supplier_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_order_logs"
    ADD CONSTRAINT "supplier_order_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."supplier_performance_log"
    ADD CONSTRAINT "supplier_performance_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_seen_features"
    ADD CONSTRAINT "user_seen_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_seen_features"
    ADD CONSTRAINT "user_seen_features_profile_id_feature_version_key" UNIQUE ("profile_id", "feature_version");



ALTER TABLE ONLY "public"."whatsapp_logs"
    ADD CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_sessions"
    ADD CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("phone");



CREATE INDEX "idx_admin_sessions_token" ON "public"."admin_sessions" USING "btree" ("token");



CREATE INDEX "idx_audit_log_created" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_org" ON "public"."admin_audit_log" USING "btree" ("target_org_id");



CREATE INDEX "idx_backups_org" ON "public"."backups" USING "btree" ("org_id", "created_at");



CREATE INDEX "idx_cashier_closings_org" ON "public"."cashier_closings" USING "btree" ("org_id", "closing_date");



CREATE INDEX "idx_cashier_closings_org_date" ON "public"."cashier_closings" USING "btree" ("org_id", "closing_date" DESC);



CREATE INDEX "idx_consent_logs_org" ON "public"."consent_logs" USING "btree" ("org_id");



CREATE INDEX "idx_consent_logs_profile" ON "public"."consent_logs" USING "btree" ("profile_id");



CREATE INDEX "idx_data_backups_org" ON "public"."data_backups" USING "btree" ("org_id", "backup_date" DESC);



CREATE INDEX "idx_fixed_expenses_org" ON "public"."fixed_expenses" USING "btree" ("org_id");



CREATE INDEX "idx_inventory_snapshots_org_date" ON "public"."inventory_snapshots" USING "btree" ("org_id", "snapshot_date");



CREATE INDEX "idx_monthly_fixed_expenses_org_month" ON "public"."monthly_fixed_expenses" USING "btree" ("org_id", "month");



CREATE INDEX "idx_movements_created_at" ON "public"."stock_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_movements_product_id" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_notification_logs_org" ON "public"."notification_logs" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "idx_notifications_branch" ON "public"."notifications" USING "btree" ("branch_id", "read");



CREATE INDEX "idx_notifications_org" ON "public"."notifications" USING "btree" ("org_id", "read");



CREATE INDEX "idx_password_reset_tokens_token" ON "public"."password_reset_tokens" USING "btree" ("token");



CREATE INDEX "idx_processed_messages_created" ON "public"."processed_messages" USING "btree" ("created_at");



CREATE INDEX "idx_product_suppliers_product" ON "public"."product_suppliers" USING "btree" ("product_id");



CREATE INDEX "idx_product_suppliers_supplier" ON "public"."product_suppliers" USING "btree" ("supplier_id");



CREATE INDEX "idx_products_org" ON "public"."products" USING "btree" ("org_id", "is_active");



CREATE INDEX "idx_products_org_id" ON "public"."products" USING "btree" ("org_id");



CREATE INDEX "idx_products_qty" ON "public"."products" USING "btree" ("qty");



CREATE INDEX "idx_profiles_org_id" ON "public"."profiles" USING "btree" ("org_id");



CREATE INDEX "idx_purchases_org" ON "public"."purchases" USING "btree" ("org_id", "created_at");



CREATE INDEX "idx_staff_phone" ON "public"."staff_members" USING "btree" ("phone");



CREATE INDEX "idx_stock_movements_product" ON "public"."stock_movements" USING "btree" ("product_id", "created_at");



CREATE INDEX "idx_subscription_events_created" ON "public"."subscription_events" USING "btree" ("created_at");



CREATE INDEX "idx_subscription_events_org" ON "public"."subscription_events" USING "btree" ("org_id");



CREATE INDEX "idx_supplier_perf_supplier" ON "public"."supplier_performance_log" USING "btree" ("supplier_id");



CREATE INDEX "idx_whatsapp_logs_org_id" ON "public"."whatsapp_logs" USING "btree" ("org_id");



CREATE INDEX "idx_whatsapp_logs_sent_at" ON "public"."whatsapp_logs" USING "btree" ("sent_at" DESC);



CREATE UNIQUE INDEX "staff_phone_org_unique" ON "public"."staff_members" USING "btree" ("org_id", "phone");



CREATE OR REPLACE TRIGGER "after_dispense_notification" AFTER INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."add_low_stock_notification"();



CREATE OR REPLACE TRIGGER "after_dispense_notify" AFTER INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."notify_low_stock_on_dispense"();



CREATE OR REPLACE TRIGGER "after_stock_movement" AFTER INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."sync_product_qty"();



CREATE OR REPLACE TRIGGER "products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."backups"
    ADD CONSTRAINT "backups_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."cashier_closings"
    ADD CONSTRAINT "cashier_closings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cashier_closings"
    ADD CONSTRAINT "cashier_closings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cashier_closings"
    ADD CONSTRAINT "cashier_closings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consent_logs"
    ADD CONSTRAINT "consent_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consent_logs"
    ADD CONSTRAINT "consent_logs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_backups"
    ADD CONSTRAINT "data_backups_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demo_requests"
    ADD CONSTRAINT "demo_requests_matched_org_id_fkey" FOREIGN KEY ("matched_org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_fixed_expenses"
    ADD CONSTRAINT "monthly_fixed_expenses_fixed_expense_id_fkey" FOREIGN KEY ("fixed_expense_id") REFERENCES "public"."fixed_expenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."monthly_fixed_expenses"
    ADD CONSTRAINT "monthly_fixed_expenses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_suppliers"
    ADD CONSTRAINT "product_suppliers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_suppliers"
    ADD CONSTRAINT "product_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_backup_supplier_id_fkey" FOREIGN KEY ("backup_supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_order_logs"
    ADD CONSTRAINT "supplier_order_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_order_logs"
    ADD CONSTRAINT "supplier_order_logs_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_escalated_from_fkey" FOREIGN KEY ("escalated_from") REFERENCES "public"."supplier_orders"("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."supplier_performance_log"
    ADD CONSTRAINT "supplier_performance_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_performance_log"
    ADD CONSTRAINT "supplier_performance_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_performance_log"
    ADD CONSTRAINT "supplier_performance_log_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_seen_features"
    ADD CONSTRAINT "user_seen_features_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_logs"
    ADD CONSTRAINT "whatsapp_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Users can manage their own seen features" ON "public"."user_seen_features" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_notifications_service_only" ON "public"."admin_notifications" USING (false);



ALTER TABLE "public"."admin_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_delete" ON "public"."supplier_applications" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "anon_insert" ON "public"."supplier_applications" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "anon_select" ON "public"."supplier_applications" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anon_update" ON "public"."supplier_applications" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_insert_notifications" ON "public"."notifications" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."backups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cashier_closings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consent_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_backups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."demo_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fixed_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."health_check_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."inventory_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."landing_partners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "logs_insert" ON "public"."whatsapp_logs" FOR INSERT WITH CHECK (("org_id" = "public"."my_org_id"()));



CREATE POLICY "logs_select" ON "public"."whatsapp_logs" FOR SELECT USING (("org_id" = "public"."my_org_id"()));



ALTER TABLE "public"."monthly_fixed_expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "movements_insert_own_org" ON "public"."stock_movements" FOR INSERT WITH CHECK (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."org_id" = ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "movements_select" ON "public"."stock_movements" FOR SELECT USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."org_id" = "public"."my_org_id"()))));



ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_org_only" ON "public"."notifications" USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "org members manage own staff" ON "public"."staff_members" TO "authenticated" USING (("org_id" = "public"."my_org_id"())) WITH CHECK (("org_id" = "public"."my_org_id"()));



CREATE POLICY "org members manage own suppliers" ON "public"."suppliers" TO "authenticated" USING (("org_id" = "public"."my_org_id"())) WITH CHECK (("org_id" = "public"."my_org_id"()));



CREATE POLICY "org members view own supplier order logs" ON "public"."supplier_order_logs" FOR SELECT TO "authenticated" USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."org_id" = "public"."my_org_id"()))));



CREATE POLICY "org_access" ON "public"."backups" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "org_access" ON "public"."products" TO "authenticated" USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "org_access" ON "public"."purchases" TO "authenticated" USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "org_access" ON "public"."stock_movements" TO "authenticated" USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "org_insert" ON "public"."push_subscriptions" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "org_insert_any" ON "public"."organizations" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_own_only" ON "public"."organizations" FOR SELECT USING (("id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "organizations_own_update" ON "public"."organizations" FOR UPDATE USING (("id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processed_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete" ON "public"."products" FOR DELETE USING (("org_id" = "public"."my_org_id"()));



CREATE POLICY "products_insert" ON "public"."products" FOR INSERT WITH CHECK (("org_id" = "public"."my_org_id"()));



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING (("org_id" = "public"."my_org_id"()));



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING (("org_id" = "public"."my_org_id"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR ("org_id" = "public"."my_org_id"())));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_all" ON "public"."feature_announcements" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "read_own_profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "service role only" ON "public"."whatsapp_sessions" USING (true) WITH CHECK (true);



CREATE POLICY "service_only" ON "public"."admins" TO "service_role" USING (true);



CREATE POLICY "service_only" ON "public"."health_check_logs" TO "service_role" USING (true);



CREATE POLICY "service_only" ON "public"."processed_messages" TO "service_role" USING (true);



CREATE POLICY "service_only" ON "public"."user_seen_features" TO "service_role" USING (true);



CREATE POLICY "service_role_admin_notifs" ON "public"."admin_notifications" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."notifications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."organizations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."purchases" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."push_subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."stock_movements" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."supplier_applications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_cashier_closings" ON "public"."cashier_closings" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_fixed_expenses" ON "public"."fixed_expenses" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_inventory_snapshots" ON "public"."inventory_snapshots" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_monthly_fixed_expenses" ON "public"."monthly_fixed_expenses" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_orgs_read" ON "public"."organizations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "service_role_suppliers" ON "public"."suppliers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_update_profiles" ON "public"."profiles" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_order_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_orders_org_only" ON "public"."supplier_orders" USING (("supplier_id" IN ( SELECT "suppliers"."id"
   FROM "public"."suppliers"
  WHERE ("suppliers"."org_id" = ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."supplier_performance_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."user_seen_features" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can manage their org branches" ON "public"."branches" USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."whatsapp_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "write_service" ON "public"."feature_announcements" TO "service_role" USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_low_stock_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_low_stock_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_low_stock_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_auth_identity"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_identity"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_identity"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_auth_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."my_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_low_stock_on_dispense"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_low_stock_on_dispense"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_low_stock_on_dispense"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_product_qty"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_product_qty"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_product_qty"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."admin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."backups" TO "anon";
GRANT ALL ON TABLE "public"."backups" TO "authenticated";
GRANT ALL ON TABLE "public"."backups" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."cashier_closings" TO "anon";
GRANT ALL ON TABLE "public"."cashier_closings" TO "authenticated";
GRANT ALL ON TABLE "public"."cashier_closings" TO "service_role";



GRANT ALL ON TABLE "public"."consent_logs" TO "anon";
GRANT ALL ON TABLE "public"."consent_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_logs" TO "service_role";



GRANT ALL ON TABLE "public"."data_backups" TO "anon";
GRANT ALL ON TABLE "public"."data_backups" TO "authenticated";
GRANT ALL ON TABLE "public"."data_backups" TO "service_role";



GRANT ALL ON TABLE "public"."demo_requests" TO "anon";
GRANT ALL ON TABLE "public"."demo_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."demo_requests" TO "service_role";



GRANT ALL ON TABLE "public"."feature_announcements" TO "anon";
GRANT ALL ON TABLE "public"."feature_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."fixed_expenses" TO "anon";
GRANT ALL ON TABLE "public"."fixed_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."fixed_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."health_check_logs" TO "anon";
GRANT ALL ON TABLE "public"."health_check_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."health_check_logs" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."inventory_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."landing_partners" TO "anon";
GRANT ALL ON TABLE "public"."landing_partners" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_partners" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_fixed_expenses" TO "anon";
GRANT ALL ON TABLE "public"."monthly_fixed_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_fixed_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."processed_messages" TO "anon";
GRANT ALL ON TABLE "public"."processed_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_messages" TO "service_role";



GRANT ALL ON TABLE "public"."product_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."product_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."product_suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_applications" TO "anon";
GRANT ALL ON TABLE "public"."supplier_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_applications" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_order_logs" TO "anon";
GRANT ALL ON TABLE "public"."supplier_order_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_order_logs" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_orders" TO "anon";
GRANT ALL ON TABLE "public"."supplier_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_orders" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_performance_log" TO "anon";
GRANT ALL ON TABLE "public"."supplier_performance_log" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_performance_log" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."user_seen_features" TO "anon";
GRANT ALL ON TABLE "public"."user_seen_features" TO "authenticated";
GRANT ALL ON TABLE "public"."user_seen_features" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_logs" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_logs" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_sessions" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_sessions" TO "service_role";



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







