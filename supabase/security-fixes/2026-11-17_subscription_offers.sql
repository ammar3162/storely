-- عروض الأسعار الخاصة (ملف العميل + عروض التجديد في «طلبات التجديد»): سجل لكل عرض وحالته
-- لمرة وحدة: العرض يفعّل مدة بسعر متفق عليه، وما يغيّر سعر التجديد القادم
-- جدول جديد فقط — ما يعدّل ولا يحذف أي بيانات موجودة
create table if not exists public.subscription_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null default 'manual' check (kind in ('manual','renewal')),
  months int not null check (months between 1 and 24),
  amount numeric(12,2) not null check (amount > 0),
  list_amount numeric(12,2),
  note text,
  status text not null default 'sent' check (status in ('sent','paid','cancelled')),
  invoice_number int,
  paid_invoice_number int,
  valid_until timestamptz not null,
  sent_by_name text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  decided_by_name text
);
create index if not exists subscription_offers_org_idx on public.subscription_offers(org_id, created_at desc);
create index if not exists subscription_offers_status_idx on public.subscription_offers(status, created_at desc);
-- للإدارة فقط عبر مفتاح الخدمة — المتصفح ما يقرأ ولا يكتب
alter table public.subscription_offers enable row level security;
revoke all on public.subscription_offers from anon, authenticated;
