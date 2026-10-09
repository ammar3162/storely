-- برنامج المناديب: أي أحد يسجّل، ياخذ رابط وكود، وكل منشأة تشترك عن طريقه وتدفع → مكافأة في محفظته

create table if not exists public.sales_agents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null unique check (phone ~ '^[0-9]{8,15}$'),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  payout_method text not null check (payout_method in ('cash','transfer')),
  iban_enc text,                     -- مشفّر (AES-GCM) — ما ينعرض كامل إلا للإدارة
  iban_last4 text check (iban_last4 is null or iban_last4 ~ '^[0-9]{4}$'),
  status text not null default 'active' check (status in ('active','suspended')),
  terms_version text not null,
  terms_accepted_at timestamptz not null default now(),
  created_ip text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  check (payout_method = 'cash' or iban_enc is not null)
);

create table if not exists public.agent_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  ip text,
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_codes_email on public.agent_login_codes (email, created_at desc);
create index if not exists idx_agent_codes_ip on public.agent_login_codes (ip, created_at desc);

create table if not exists public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.sales_agents(id) on delete cascade,
  ip text, user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_agent_sessions_agent on public.agent_sessions (agent_id);

-- المنشأة اللي سجّلت عن طريق مندوب
alter table public.organizations add column if not exists referred_by_agent uuid references public.sales_agents(id) on delete set null;
alter table public.organizations add column if not exists referred_at timestamptz;
create index if not exists idx_orgs_referred_by_agent on public.organizations (referred_by_agent) where referred_by_agent is not null;

-- مكافأة وحدة لكل منشأة (أول اشتراك مدفوع)
create table if not exists public.agent_commissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.sales_agents(id) on delete cascade,
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  plan text not null check (plan in ('basic','pro','advanced')),
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'available' check (status in ('available','cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_reason text
);
create index if not exists idx_agent_commissions_agent on public.agent_commissions (agent_id, created_at desc);

-- الصرف (كاش أو تحويل) — الرصيد = المكافآت − المصروف
create table if not exists public.agent_payouts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.sales_agents(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash','transfer')),
  note text check (note is null or char_length(note) <= 200),
  paid_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_payouts_agent on public.agent_payouts (agent_id, created_at desc);

alter table public.sales_agents enable row level security;
alter table public.agent_login_codes enable row level security;
alter table public.agent_sessions enable row level security;
alter table public.agent_commissions enable row level security;
alter table public.agent_payouts enable row level security;
revoke all on public.sales_agents, public.agent_login_codes, public.agent_sessions, public.agent_commissions, public.agent_payouts from anon, authenticated;

notify pgrst, 'reload schema';
