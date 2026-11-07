-- الباقات الجديدة (2026-11): الأساسية essential / التشغيل ops / الكاملة full — سعر لكل فرع.
-- الأسعار والحدود في الكود (src/lib/planPricing.ts)، والباقات القديمة basic/pro/advanced باقية بدون تغيير.
-- organizations.plan ما عليه قيد، و org_addon_subscriptions.branch_ids (uuid[]) موجود أصلاً.
-- التغيير الوحيد: طلب الترقية يقبل الباقات الجديدة (الأساسية والتشغيل والكاملة — الأساسية لعميل «ابنِ باقتك»).
-- ما فيه حذف ولا تعديل على أي صف موجود.
begin;
alter table public.plan_requests drop constraint if exists plan_requests_target_plan_check;
alter table public.plan_requests add constraint plan_requests_target_plan_check
  check (target_plan = any (array['pro'::text, 'advanced'::text, 'essential'::text, 'ops'::text, 'full'::text]));
commit;
