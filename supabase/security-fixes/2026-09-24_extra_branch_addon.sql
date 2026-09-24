-- فرع إضافي بالكمية (49 ر.س/شهر لكل فرع) — لكل الباقات
-- قبل: تفعيل الإضافة كان يزيد organizations.max_branches بـ 1.
-- بعد: max_branches = فروع الباقة فقط، والإضافة تنحسب من الكمية وقت الطلب (src/lib/branchLimit.ts).
-- شغّله قبل نشر الكود (على التجريبي أولاً ثم الإنتاج).

begin;

-- نسخة احتياطية للاسترجاع
create table if not exists _bak_2026_09_24_max_branches as
  select id, max_branches from organizations;
create table if not exists _bak_2026_09_24_extra_branch_addon as
  select * from marketplace_addons where slug = 'extra_branch';
-- الجداول الاحتياطية ما تنقرأ من الـ API (RLS بدون سياسات)
alter table _bak_2026_09_24_max_branches enable row level security;
alter table _bak_2026_09_24_extra_branch_addon enable row level security;

-- 1) نرجّع max_branches لحد الباقة: نشيل الـ +1 اللي أضافه التفعيل القديم
update organizations o
set max_branches = greatest(1, o.max_branches - 1)
from org_addon_subscriptions s
join marketplace_addons a on a.id = s.addon_id
where s.org_id = o.id
  and a.slug = 'extra_branch'
  and s.status = 'active';

-- 2) الكمية الحالية = 1 (النظام القديم ما كان يدعم أكثر من فرع)
update org_addon_subscriptions s
set quantity = 1
from marketplace_addons a
where a.id = s.addon_id and a.slug = 'extra_branch' and coalesce(s.quantity, 0) < 1;

-- 3) السعر 49 ر.س لكل فرع، ومتاحة
update marketplace_addons
set monthly_price = 49, is_active = true
where slug = 'extra_branch';

commit;

-- تحقق: لازم يطلع صف واحد بسعر 49
select slug, name, monthly_price, is_active from marketplace_addons where slug = 'extra_branch';
