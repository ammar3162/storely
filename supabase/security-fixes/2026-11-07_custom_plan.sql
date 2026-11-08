-- «ابنِ باقتك» (باقة custom): العميل يختار المزايا بنفسه.
-- 1) إضافتين جديدتين للمزايا اللي كانت مفتوحة لكل الباقات (المخزون، المشتريات) — تنباع لباقة custom بس
--    (الباقات الثابتة فيها هالمزايا أصلاً، والكود يخفيها لها — lib/planPricing addonIncludedIn).
--    السعر هنا للفرع الأول؛ سعر الفرع الإضافي في الكود (CUSTOM_MODULES).
-- 2) organizations.staff_included: عدد الموظفين اللي اختاره عميل custom (فاضي = 6 لكل فرع).
-- ما فيه حذف ولا تعديل على صفوف موجودة.
begin;
insert into public.marketplace_addons (slug, name, description, icon, monthly_price, is_active, sort_order)
values
  ('mod_inventory', 'المخزون والموردين', 'المخزون والصرف والهدر والجرد والوصفات والموردين وطلب التوريد', '', 69, true, 2),
  ('mod_purchases', 'المشتريات والفواتير', 'فواتير الشراء وقراءتها بالذكاء الاصطناعي ومستحقات الموردين والإقرار الضريبي', '', 54, true, 3)
on conflict (slug) do nothing;
alter table public.organizations add column if not exists staff_included integer;
alter table public.organizations drop constraint if exists organizations_staff_included_check;
alter table public.organizations add constraint organizations_staff_included_check check (staff_included is null or (staff_included >= 1 and staff_included <= 500));
commit;
