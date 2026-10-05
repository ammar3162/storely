-- الربط مع المحاسب: المالك يحدد محاسبه، وش يوصله، ومتى (يومي/أسبوعي/شهري)، وبأي طريقة (إيميل/واتساب)
create table if not exists public.accountant_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,          -- null = كل الفروع
  name text not null check (char_length(name) between 1 and 80),
  email text check (email is null or char_length(email) <= 254),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'),
  channels text[] not null default '{email}' check (channels <@ array['email','whatsapp']::text[] and cardinality(channels) >= 1),
  sections text[] not null default '{sales,purchases,vat,payables,payroll,expenses,cash_diff}'
    check (sections <@ array['sales','purchases','vat','payables','payroll','expenses','cash_diff','stock']::text[] and cardinality(sections) >= 1),
  frequency text not null default 'monthly' check (frequency in ('daily','weekly','monthly')),
  weekday smallint not null default 0 check (weekday between 0 and 6),        -- للأسبوعي: يوم الإرسال
  month_day smallint not null default 1 check (month_day between 1 and 28),  -- للشهري: تاريخ الإرسال
  vat_registered boolean not null default true,
  is_active boolean not null default true,
  last_period_end date,                                                        -- آخر فترة انرسلت — يمنع التكرار
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accountant_links enable row level security;
revoke all on public.accountant_links from anon, authenticated;

-- كل تقرير انرسل (أو تجربة): رابط آمن للتقرير + حالة الإرسال
create table if not exists public.accountant_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  link_id uuid references public.accountant_links(id) on delete set null,
  period_start date not null,
  period_end date not null,
  token_hash text not null unique,                 -- الرابط يحمل التوكن، ونخزن بصمته بس
  expires_at timestamptz not null,
  is_test boolean not null default false,
  email_status text check (email_status in ('sent','failed','skipped')),
  whatsapp_status text check (whatsapp_status in ('sent','failed','skipped')),
  error text,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_accountant_reports_org on public.accountant_reports (org_id, created_at desc);
alter table public.accountant_reports enable row level security;
revoke all on public.accountant_reports from anon, authenticated;

notify pgrst, 'reload schema';
