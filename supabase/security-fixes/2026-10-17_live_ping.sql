-- تحديث فوري للصفحات: أي تغيير على جداول المنشأة يرسل «إشارة» قصيرة على قناة org:<المنشأة>
-- الإشارة فيها اسم الجدول والفرع بس — بدون أي بيانات. الصفحة المفتوحة تعيد جلب بياناتها من الخادم بصلاحياتها.
create or replace function public.org_live_ping() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := to_jsonb(coalesce(new, old));
begin
  if r ? 'org_id' and (r->>'org_id') is not null then
    perform realtime.send(jsonb_build_object('t', TG_TABLE_NAME, 'b', r->>'branch_id'), 'change', 'org:' || (r->>'org_id'), false);
  end if;
  return null;
exception when others then
  return null;   -- الإشارة ما تكسر أي حفظ أبداً
end $$;

do $$
declare t text;
begin
  foreach t in array array['products','stock_movements','purchases','cashier_closings','staff_members','staff_attendance',
    'staff_leave_requests','staff_payroll_adjustments','attendance_permission_requests','suppliers','supplier_orders','staff_tasks',
    'notifications','shifts','branches','fixed_expenses','monthly_fixed_expenses','delivery_income','quote_requests','staff_notifications'] loop
    execute format('drop trigger if exists trg_org_live_ping on public.%I', t);
    execute format('create trigger trg_org_live_ping after insert or update or delete on public.%I for each row execute function public.org_live_ping()', t);
  end loop;
end $$;
