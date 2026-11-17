drop index if exists public.push_subscriptions_org_idx;
alter table public.push_subscriptions drop column if exists branch_id;
alter table public.push_subscriptions drop column if exists profile_id;
