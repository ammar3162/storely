-- 2026-10-21 منيو لكل فرع
-- branch_ids: الفروع المشترك لها بإضافة المنيو (null = اشتراك قديم: منيو واحد للمنشأة كلها، بدون تغيير)
-- shop_items.branch_id: الصنف لفرع معيّن (null = لكل الفروع)
-- branches.shop_slug / shop_hours: رابط الفرع وأوقاته بالمنيو (shop_hours null = نفس أوقات المنشأة)
begin;
alter table public.org_addon_subscriptions add column if not exists branch_ids uuid[];

alter table public.shop_items add column if not exists branch_id uuid references public.branches(id) on delete cascade;
create index if not exists shop_items_org_branch_idx on public.shop_items (org_id, branch_id);
-- متوفر/نفدت (يظهر باهت للزبون) وإخفاء من المنيو بدون حذف
alter table public.shop_items add column if not exists is_available boolean not null default true;
alter table public.shop_items add column if not exists is_hidden boolean not null default false;

alter table public.branches add column if not exists shop_slug text;
alter table public.branches add column if not exists shop_hours jsonb;
create unique index if not exists branches_org_shop_slug_key on public.branches (org_id, shop_slug) where shop_slug is not null;
commit;
