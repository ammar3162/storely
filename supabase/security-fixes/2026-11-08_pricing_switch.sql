-- 2026-11-08: اختيار المشتركين الحاليين لمزاياهم بالأسعار الجديدة (lib/pricingSwitch).
-- صف لكل منشأة: المزايا المختارة والفاتورة قبل/بعد والنتيجة (switch = ينتقل مع التجديد، keep = يبقى على باقته لأنها أرخص).
-- الكتابة من الخادم فقط (service role) — بدون أي سياسة للمتصفح.
create table if not exists public.pricing_switches (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  modules text[] not null default '{}',
  branches integer not null default 1,
  current_monthly numeric not null default 0,
  new_monthly numeric not null default 0,
  outcome text not null check (outcome in ('switch', 'keep')),
  chosen_by uuid,
  chosen_at timestamptz not null default now(),
  applied_at timestamptz
);
alter table public.pricing_switches enable row level security;
revoke all on public.pricing_switches from anon, authenticated;
