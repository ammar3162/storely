-- رمز الحماية للمالك (يطلبه تعديل/حذف إقفال الكاشير) + سجل تعديلات الإقفالات

-- الرمز مشفّر (bcrypt) + قفل بعد محاولات خاطئة
alter table public.organizations add column if not exists owner_pin_hash text;
alter table public.organizations add column if not exists owner_pin_failed smallint not null default 0;
alter table public.organizations add column if not exists owner_pin_locked_until timestamptz;

-- علامة «معدّل» على الإقفال
alter table public.cashier_closings add column if not exists edited_at timestamptz;
alter table public.cashier_closings add column if not exists edited_by text;
alter table public.cashier_closings add column if not exists edit_count integer not null default 0;

-- سجل كل تعديل: القيم قبل وبعد ومين عدّل
create table if not exists public.cashier_closing_edits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  closing_id uuid not null,
  action text not null check (action in ('edit','delete')),
  before jsonb not null,
  after jsonb,
  edited_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_closing_edits_closing on public.cashier_closing_edits (closing_id, created_at desc);
create index if not exists idx_closing_edits_org on public.cashier_closing_edits (org_id, created_at desc);
alter table public.cashier_closing_edits enable row level security;
revoke all on public.cashier_closing_edits from anon, authenticated;

notify pgrst, 'reload schema';
