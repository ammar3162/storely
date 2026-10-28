-- 2026-10-28 طلبات الترقية: عميل الأساسية يطلب المتوسطة/المتقدمة من صفحة الإضافات، والأدمن يوافق أو يرفض من لوحته
begin;
create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  current_plan text,
  target_plan text not null check (target_plan in ('pro', 'advanced')),
  bill_at_request numeric,          -- فاتورته الشهرية وقت الطلب (للأدمن يشوف الفرق)
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reason text,
  requested_by uuid,
  decided_by_name text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists plan_requests_status_idx on public.plan_requests (status, created_at desc);
-- طلب ترقية معلّق واحد لكل منشأة
create unique index if not exists plan_requests_one_pending on public.plan_requests (org_id) where status = 'pending';
alter table public.plan_requests enable row level security;
revoke all on public.plan_requests from anon, authenticated, public;
-- التحديث الفوري: صفحة العميل تعرف لما الأدمن يوافق
drop trigger if exists trg_org_live_ping on public.plan_requests;
create trigger trg_org_live_ping after insert or update or delete on public.plan_requests for each row execute function public.org_live_ping();
commit;
