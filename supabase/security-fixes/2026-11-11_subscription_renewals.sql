-- طلبات تجديد الاشتراك: المالك يضغط «تجديد الاشتراك» → حسابه يشتغل (يوم سماح لو كان منتهي) وطلب «بانتظار الدفع» للإدارة
-- مصمم لبوابة الدفع لاحقاً: amount / payment_method / payment_ref تتعبى من البوابة، والحالة تصير paid تلقائياً
create table if not exists public.subscription_renewals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','cancelled')),
  previous_ends_at timestamptz,
  grace_until timestamptz,
  amount numeric(12,2),
  payment_method text check (payment_method in ('manual','gateway')),
  payment_ref text,
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_name text
);
-- طلب واحد معلّق لكل منشأة (يمنع تمديد يوم كل يوم بدون دفع)
create unique index if not exists subscription_renewals_one_pending on public.subscription_renewals(org_id) where status = 'pending_payment';
create index if not exists subscription_renewals_status_idx on public.subscription_renewals(status, created_at desc);
alter table public.subscription_renewals enable row level security;
revoke all on public.subscription_renewals from anon, authenticated;
