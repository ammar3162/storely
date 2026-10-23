-- 2026-10-22 إعلانات الإيميل من لوحة الأدمن
-- email_optouts: اللي ألغوا الاشتراك بالإعلانات (ما يوصلهم إعلان مرة ثانية — إيميلات النظام المهمة ما تتأثر)
-- marketing_campaigns: سجل الحملات المرسلة
-- الجدولين للخادم بس (service role) — المتصفح ما يقرأ ولا يكتب
begin;
create table if not exists public.email_optouts (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  title text not null,
  body text not null,
  button_label text,
  button_url text,
  segment text not null,
  recipients integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.email_optouts enable row level security;
alter table public.marketing_campaigns enable row level security;
revoke all on public.email_optouts from anon, authenticated, public;
revoke all on public.marketing_campaigns from anon, authenticated, public;
commit;
