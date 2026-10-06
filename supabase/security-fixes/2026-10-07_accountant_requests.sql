-- طلبات المحاسب للمنشأة: «ناقص الرقم الضريبي»، «الصورة مو واضحة»… والمالك يرد أو يكمّل البيانات
create table if not exists public.accountant_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  accountant_id uuid not null references public.accountant_users(id) on delete cascade,
  invoice_group uuid,                                                          -- الفاتورة (كل أصنافها)
  purchase_id uuid references public.purchases(id) on delete set null,          -- فاتورة قديمة بدون group
  closing_id uuid references public.cashier_closings(id) on delete set null,
  kind text not null check (kind in ('missing_vat','unclear_image','amount','explain','document','other')),
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'open' check (status in ('open','answered','resolved')),
  owner_reply text check (owner_reply is null or char_length(owner_reply) <= 500),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  resolved_at timestamptz
);
create index if not exists idx_acc_requests_org on public.accountant_requests (org_id, status, created_at desc);
create index if not exists idx_acc_requests_accountant on public.accountant_requests (accountant_id, org_id, created_at desc);
alter table public.accountant_requests enable row level security;
revoke all on public.accountant_requests from anon, authenticated;
notify pgrst, 'reload schema';
