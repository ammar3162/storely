-- الجرد الفعلي: كم عدّ الموظف/المالك فعلاً من كل صنف بتاريخ معيّن.
-- الفرق عن رصيد النظام يُسجَّل كحركة adjustment (فيبقى products.qty = مجموع الحركات).
-- يُستخدم لحساب الاستهلاك الحقيقي بين جردين لتقدير إنتاج الوصفات.
create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  counted_qty integer not null check (counted_qty >= 0),
  system_qty integer not null,
  counted_at timestamptz not null default now(),
  counted_by uuid references public.profiles(id) on delete set null,
  counted_by_name text
);
create index if not exists stock_counts_org_product_at on public.stock_counts (org_id, product_id, counted_at desc);
alter table public.stock_counts enable row level security;
revoke all on public.stock_counts from anon, authenticated, public;
