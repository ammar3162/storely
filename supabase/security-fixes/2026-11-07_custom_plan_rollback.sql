-- رجوع 2026-11-07_custom_plan.sql. قبله: حوّل منشآت custom لباقة ثابتة (مثلاً ops) وألغِ اشتراكات mod_* (بعد موافقة المالك):
-- update public.organizations set plan = 'ops' where plan = 'custom';
begin;
delete from public.org_addon_subscriptions where addon_id in (select id from public.marketplace_addons where slug in ('mod_inventory','mod_purchases')) and status = 'cancelled';
delete from public.addon_requests where addon_id in (select id from public.marketplace_addons where slug in ('mod_inventory','mod_purchases')) and status <> 'pending';
delete from public.marketplace_addons where slug in ('mod_inventory','mod_purchases')
  and not exists (select 1 from public.org_addon_subscriptions s where s.addon_id = marketplace_addons.id);
alter table public.organizations drop constraint if exists organizations_staff_included_check;
alter table public.organizations drop column if exists staff_included;
commit;
