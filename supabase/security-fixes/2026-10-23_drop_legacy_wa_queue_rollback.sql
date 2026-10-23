-- تراجع: يرجّع الدالتين والتريقرات كما كانت بالإنتاج بالضبط (منسوخة من قاعدة الإنتاج 2026-10-23)، والرسائل الملغاة ترجع "pending"
begin;
update public.whatsapp_logs set status = 'pending' where status = 'skipped';
alter table public.whatsapp_logs drop constraint if exists whatsapp_logs_status_check;
alter table public.whatsapp_logs add constraint whatsapp_logs_status_check check (status in ('sent', 'failed', 'pending'));

CREATE OR REPLACE FUNCTION public.notify_low_stock_on_dispense()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare v_product products%rowtype; v_org organizations%rowtype; v_new_qty numeric;
begin
  select * into v_product from products where id = new.product_id;
  v_new_qty := v_product.qty + new.qty_change;
  if new.type = 'out' and v_new_qty <= v_product.reorder_point then
    select * into v_org from organizations where id = v_product.org_id;
    if coalesce(v_org.whatsapp_number, '') <> '' then
      begin
        insert into whatsapp_logs (org_id, phone, message, status) values (
          v_product.org_id, v_org.whatsapp_number,
          '⚠️ *تنبيه نقص مخزون — ' || coalesce(v_org.name, '') || '*' || chr(10) || chr(10) ||
          'المنتج: ' || coalesce(v_product.name, '') || chr(10) ||
          'الكمية المتبقية: ' || coalesce(v_new_qty::text, '') || ' ' || coalesce(v_product.unit, '') || chr(10) ||
          'الحد الأدنى: ' || coalesce(v_product.reorder_point::text, '') || chr(10) || chr(10) ||
          '⚡ يرجى إعادة الطلب في أقرب وقت' || chr(10) || '_Storely — نظام إدارة المخزون_',
          'pending');
      exception when others then null;
      end;
    end if;
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.add_low_stock_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare v_product products%rowtype; v_org organizations%rowtype; v_new_qty numeric;
begin
  select * into v_product from products where id = new.product_id;
  v_new_qty := v_product.qty + new.qty_change;
  if new.type = 'out' and v_new_qty <= v_product.reorder_point then
    select * into v_org from organizations where id = v_product.org_id;
    if coalesce(v_org.whatsapp_number, '') <> '' then
      begin
        insert into whatsapp_logs (org_id, phone, message, status) values (
          v_product.org_id, v_org.whatsapp_number,
          '⚠️ *تنبيه نقص مخزون — ' || coalesce(v_org.name, '') || '*' || chr(10) || chr(10) ||
          'المنتج: ' || coalesce(v_product.name, '') || chr(10) ||
          'الكمية المتبقية: ' || coalesce(v_new_qty::text, '') || ' ' || coalesce(v_product.unit, '') || chr(10) ||
          'الحد الأدنى: ' || coalesce(v_product.reorder_point::text, '') || chr(10) || chr(10) ||
          '⚡ يرجى إعادة الطلب في أقرب وقت' || chr(10) || '_Storely — نظام إدارة المخزون_',
          'pending');
      exception when others then null;
      end;
    end if;
  end if;
  return new;
end; $function$;

CREATE TRIGGER after_dispense_notification AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION add_low_stock_notification();
CREATE TRIGGER after_dispense_notify AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION notify_low_stock_on_dispense();
commit;
