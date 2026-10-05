-- بوابة المحاسب: حساب واحد للمحاسب يشوف فيه كل المنشآت اللي أعطته إذن (قراءة فقط)

-- المحاسبين (الدخول برمز على الإيميل — بدون كلمة مرور)
create table if not exists public.accountant_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  name text check (name is null or char_length(name) <= 80),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- رموز الدخول (نخزن بصمة الرمز بس)
create table if not exists public.accountant_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  ip text,
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_acc_codes_email on public.accountant_login_codes (email, created_at desc);
create index if not exists idx_acc_codes_ip on public.accountant_login_codes (ip, created_at desc);

-- إذن المنشأة للمحاسب
create table if not exists public.accountant_access (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(email)),
  accountant_id uuid references public.accountant_users(id) on delete cascade,
  name text check (name is null or char_length(name) <= 80),
  branch_id uuid references public.branches(id) on delete set null,      -- null = كل الفروع
  sections text[] not null default '{sales,purchases,vat,payables,expenses,cash_diff}'
    check (sections <@ array['sales','purchases','vat','payables','payroll','expenses','cash_diff','stock']::text[] and cardinality(sections) >= 1),
  vat_registered boolean not null default true,
  status text not null default 'pending' check (status in ('pending','active')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  last_view_at timestamptz,
  unique (org_id, email)
);
create index if not exists idx_acc_access_accountant on public.accountant_access (accountant_id) where accountant_id is not null;
create index if not exists idx_acc_access_email on public.accountant_access (email);

-- سجل مشاهدات المحاسب (المالك يشوف آخر دخول)
create table if not exists public.accountant_view_logs (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  accountant_id uuid not null references public.accountant_users(id) on delete cascade,
  action text not null check (action in ('view','download')),
  period_start date, period_end date,
  created_at timestamptz not null default now()
);
create index if not exists idx_acc_view_logs_org on public.accountant_view_logs (org_id, created_at desc);

alter table public.accountant_users enable row level security;
alter table public.accountant_login_codes enable row level security;
alter table public.accountant_access enable row level security;
alter table public.accountant_view_logs enable row level security;
revoke all on public.accountant_users, public.accountant_login_codes, public.accountant_access, public.accountant_view_logs from anon, authenticated;

notify pgrst, 'reload schema';
