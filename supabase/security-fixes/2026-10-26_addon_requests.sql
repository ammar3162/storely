-- 2026-10-26 طلبات الإضافات: العميل يطلب من صفحة الإضافات، والأدمن يوافق أو يرفض من لوحته (بدل واتساب)
begin;
create table if not exists public.addon_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  addon_id uuid not null references public.marketplace_addons(id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 20),
  branch_ids uuid[],
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reason text,
  requested_by uuid,
  decided_by_name text,
  prorated_amount numeric,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists addon_requests_status_idx on public.addon_requests (status, created_at desc);
-- طلب واحد معلّق لكل إضافة بكل منشأة
create unique index if not exists addon_requests_one_pending on public.addon_requests (org_id, addon_id) where status = 'pending';
alter table public.addon_requests enable row level security;
revoke all on public.addon_requests from anon, authenticated, public;
commit;
