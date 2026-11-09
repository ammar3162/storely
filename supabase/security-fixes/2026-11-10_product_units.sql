-- 2026-11-10: وحدات الشراء لكل صنف — الصنف يُخزَّن ويُصرف بوحدة (مثلاً كيس)، ويُشترى بوحدة أكبر (كرتون = 12 كيس).
-- عند تسجيل فاتورة بوحدة الشراء تتحوّل الكمية لوحدة المخزون تلقائياً، وتُحسب التكلفة لكل وحدة مخزون.
-- جدول جديد فقط — ما يلمس أي بيانات موجودة. القراءة والكتابة من الخادم فقط (بدون سياسات للمتصفح).
create table if not exists public.product_units (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  unit        text not null check (char_length(unit) between 1 and 30),   -- اسم وحدة الشراء (موحّد: كرتون، كيس، شدة...)
  factor      numeric(12,4) not null check (factor > 0 and factor <= 100000), -- كم وحدة مخزون فيها
  created_at  timestamptz not null default now(),
  unique (product_id, unit)
);
create index if not exists product_units_org_idx on public.product_units (org_id);
alter table public.product_units enable row level security;
revoke all on table public.product_units from anon, authenticated, public;
grant all on table public.product_units to service_role;
notify pgrst, 'reload schema';
