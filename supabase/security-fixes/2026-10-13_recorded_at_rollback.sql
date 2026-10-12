drop index if exists public.purchases_org_recorded_idx;
drop index if exists public.stock_movements_org_recorded_idx;
alter table public.purchases drop column if exists recorded_at;
alter table public.stock_movements drop column if exists recorded_at;
