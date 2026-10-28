-- تسعير جديد (28 أكتوبر 2026) مع تثبيت أسعار المشتركين الحاليين.
-- 1) سعر مثبّت لكل اشتراك إضافة، وسعر باقة مثبّت للمنشأة — فاضي = السعر الحالي من الجدول/الكود
-- 2) المشتركين الحاليين (إضافات سارية + باقة متقدمة مدفوعة) يتثبّت لهم سعرهم القديم
-- 3) أسعار الإضافات الجديدة للمشتركين الجدد
-- ما يحذف أي بيانات. الترتيب مهم: التثبيت قبل تغيير الأسعار.
alter table public.org_addon_subscriptions add column if not exists locked_price numeric(10,2);
alter table public.organizations add column if not exists locked_plan_monthly numeric(10,2);

update public.org_addon_subscriptions s
   set locked_price = a.monthly_price
  from public.marketplace_addons a
 where a.id = s.addon_id and s.status = 'active' and s.expires_at > now() and s.locked_price is null;

update public.organizations o
   set locked_plan_monthly = 399
 where o.plan = 'advanced' and o.locked_plan_monthly is null
   and exists (select 1 from public.profiles p where p.org_id = o.id and p.role = 'owner' and p.subscription_type = 'paid');

update public.marketplace_addons set monthly_price = 79 where slug = 'extra_branch';
update public.marketplace_addons set monthly_price = 10 where slug = 'extra_staff';
update public.marketplace_addons set monthly_price = 39 where slug = 'hr_full';
update public.marketplace_addons set monthly_price = 29 where slug in ('cashier_closing', 'profitability', 'ai_tools');
update public.marketplace_addons set monthly_price = 49 where slug = 'online_menu';
