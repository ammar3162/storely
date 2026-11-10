-- فريق مكتب المحاسبة: المحاسب الرئيسي يضيف موظفين ويوزع عليهم عملاءه
-- إذن الموظف = صف في accountant_access مربوط بإذن المحاسب الرئيسي (delegated_from):
--   يطلع للمالك في قائمة المحاسبين ويقدر يشيله، ولو المالك شال المحاسب الرئيسي ينشال الموظف معه (cascade)
alter table public.accountant_access add column if not exists delegated_from uuid references public.accountant_access(id) on delete cascade;
create index if not exists accountant_access_delegated_idx on public.accountant_access(delegated_from) where delegated_from is not null;

create table if not exists public.accountant_team (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.accountant_users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (lead_id, email)
);
alter table public.accountant_team enable row level security;
revoke all on public.accountant_team from anon, authenticated;
