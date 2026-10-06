-- بوابة المحاسب: أجهزة الدخول (يقدر يطلّعها) + مدة للإذن
create table if not exists public.accountant_sessions (
  id uuid primary key default gen_random_uuid(),
  accountant_id uuid not null references public.accountant_users(id) on delete cascade,
  user_agent text check (user_agent is null or char_length(user_agent) <= 200),
  ip text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_acc_sessions_accountant on public.accountant_sessions (accountant_id, created_at desc);
alter table public.accountant_sessions enable row level security;
revoke all on public.accountant_sessions from anon, authenticated;

-- الإذن ينتهي لحاله بهالتاريخ (null = بدون نهاية)
alter table public.accountant_access add column if not exists expires_on date;

notify pgrst, 'reload schema';
