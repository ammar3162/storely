-- ============================================================================
-- إصلاح فشل الصرف عند نزول الصنف تحت الحد الأدنى — 2026-09-23
-- ============================================================================
-- المشكلة: الـ triggers "after_dispense_notify" و "after_dispense_notification" على stock_movements
-- تكتب رسالة بجدول whatsapp_logs (phone و message إجباريين NOT NULL):
--   - notify_low_stock_on_dispense ما يتأكد إن للمنشأة رقم واتساب ← phone = NULL ← خطأ
--   - الاثنين يبنون الرسالة بالدمج (||) — لو أي جزء فاضي (وحدة الصنف مثلاً) تصير الرسالة كلها NULL ← خطأ
-- وأي خطأ بالـ trigger يلغي عملية الصرف كاملة ("حدث خطأ").
--
-- الحل (بدون تغيير أي بيانات):
--   - نتخطى التسجيل لو ما فيه رقم واتساب
--   - COALESCE لكل أجزاء الرسالة
--   - تسجيل الرسالة داخل BEGIN/EXCEPTION: لو فشل لأي سبب، الصرف يكمل عادي
-- الصرف (حركة المخزون) ما يتأثر بأي شكل بنجاح أو فشل تسجيل الرسالة.
-- ============================================================================

begin;

create or replace function public.notify_low_stock_on_dispense()
 returns trigger
 language plpgsql
as $function$
declare
  v_product products%rowtype;
  v_org organizations%rowtype;
  v_new_qty numeric;
begin
  select * into v_product from products where id = new.product_id;
  v_new_qty := v_product.qty + new.qty_change;

  if new.type = 'out' and v_new_qty <= v_product.reorder_point then
    select * into v_org from organizations where id = v_product.org_id;
    if coalesce(v_org.whatsapp_number, '') <> '' then
      begin
        insert into whatsapp_logs (org_id, phone, message, status)
        values (
          v_product.org_id,
          v_org.whatsapp_number,
          '⚠️ *تنبيه نقص مخزون — ' || coalesce(v_org.name, '') || '*' || chr(10) || chr(10) ||
          'المنتج: ' || coalesce(v_product.name, '') || chr(10) ||
          'الكمية المتبقية: ' || coalesce(v_new_qty::text, '') || ' ' || coalesce(v_product.unit, '') || chr(10) ||
          'الحد الأدنى: ' || coalesce(v_product.reorder_point::text, '') || chr(10) || chr(10) ||
          '⚡ يرجى إعادة الطلب في أقرب وقت' || chr(10) ||
          '_Storely — نظام إدارة المخزون_',
          'pending'
        );
      exception when others then
        null; -- تسجيل الرسالة ما يوقف الصرف أبداً
      end;
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.add_low_stock_notification()
 returns trigger
 language plpgsql
as $function$
declare
  v_product products%rowtype;
  v_org organizations%rowtype;
  v_new_qty numeric;
begin
  select * into v_product from products where id = new.product_id;
  v_new_qty := v_product.qty + new.qty_change;

  if new.type = 'out' and v_new_qty <= v_product.reorder_point then
    select * into v_org from organizations where id = v_product.org_id;
    if coalesce(v_org.whatsapp_number, '') <> '' then
      begin
        insert into whatsapp_logs (org_id, phone, message, status)
        values (
          v_product.org_id,
          v_org.whatsapp_number,
          '⚠️ *تنبيه نقص مخزون — ' || coalesce(v_org.name, '') || '*' || chr(10) || chr(10) ||
          'المنتج: ' || coalesce(v_product.name, '') || chr(10) ||
          'الكمية المتبقية: ' || coalesce(v_new_qty::text, '') || ' ' || coalesce(v_product.unit, '') || chr(10) ||
          'الحد الأدنى: ' || coalesce(v_product.reorder_point::text, '') || chr(10) || chr(10) ||
          '⚡ يرجى إعادة الطلب في أقرب وقت' || chr(10) ||
          '_Storely — نظام إدارة المخزون_',
          'pending'
        );
      exception when others then
        null; -- تسجيل الرسالة ما يوقف الصرف أبداً
      end;
    end if;
  end if;
  return new;
end;
$function$;

commit;
