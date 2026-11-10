-- دليل حسابات المحاسب لكل عميل (تصدير القيود): المحاسب يحدد أرقام الحسابات مرة وتنحفظ
create table if not exists public.accountant_account_maps (
  org_id uuid not null references public.organizations(id) on delete cascade,
  accountant_id uuid not null references public.accountant_users(id) on delete cascade,
  map jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (org_id, accountant_id)
);
alter table public.accountant_account_maps enable row level security;
revoke all on public.accountant_account_maps from anon, authenticated;
-- بدون سياسات: الوصول من الخادم فقط (service_role)
