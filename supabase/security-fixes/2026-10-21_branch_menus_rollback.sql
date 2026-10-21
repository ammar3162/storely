-- تراجع: منيو لكل فرع (الأصناف ترجع كلها للمنشأة كاملة)
begin;
drop index if exists public.branches_org_shop_slug_key;
alter table public.branches drop column if exists shop_hours;
alter table public.branches drop column if exists shop_slug;
alter table public.shop_items drop column if exists is_hidden;
alter table public.shop_items drop column if exists is_available;
drop index if exists public.shop_items_org_branch_idx;
alter table public.shop_items drop column if exists branch_id;
alter table public.org_addon_subscriptions drop column if exists branch_ids;
commit;
