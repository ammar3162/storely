-- رجوع (STAGING): يرجّع الهيكل القديم كما كان (بدون بيانات التجربة المحذوفة)
alter table public.products add column if not exists is_recipe boolean default false;
alter table public.products add column if not exists allow_direct_dispense boolean default true;
alter table public.bot_sent_messages alter column message_id type text;
create table if not exists public.recipe_sales_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  branch_id uuid,
  product_id uuid not null references public.products(id) on delete cascade,
  qty numeric not null,
  staff_name text,
  profile_id uuid,
  created_at timestamptz default now()
);
alter table public.recipe_sales_log enable row level security;
drop policy if exists "org members can view recipe sales log" on public.recipe_sales_log;
create policy "org members can view recipe sales log" on public.recipe_sales_log for select
  using (exists (select 1 from public.profiles pr where pr.org_id = recipe_sales_log.org_id and pr.id = auth.uid()));
notify pgrst, 'reload schema';
