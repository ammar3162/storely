-- رجوع 2026-11-07_pricing_v2.sql — يرجّع قيد طلب الترقية للباقات القديمة بس.
-- يفشل لو فيه طلبات ترقية لـ ops/full — احذفها أو غيّرها أول (بعد مراجعة المالك).
begin;
alter table public.plan_requests drop constraint if exists plan_requests_target_plan_check;
alter table public.plan_requests add constraint plan_requests_target_plan_check
  check (target_plan = any (array['pro'::text, 'advanced'::text]));
commit;

-- لو بنرجّع الكود نفسه (git revert) بعد ما سجّلت منشآت على الباقات الجديدة:
-- الكود القديم يقرأ أي باقة ما يعرفها حسب عدد الفروع، فنحوّلها أول لأقرب باقة قديمة (بعد موافقة المالك):
-- update public.organizations set plan = 'basic' where plan = 'essential';
-- update public.organizations set plan = 'pro'   where plan in ('ops', 'full');
