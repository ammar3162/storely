-- البريد الوارد: ردود العملاء على support@storely.dev (ImprovMX يحوّلها لعنوان الاستقبال في Resend،
-- و Resend يبلّغ /api/inbound-email). تظهر في الأدمن «صندوق الطلبات ← البريد الوارد» وفي ملف العميل.
-- جدول جديد فقط — ما يلمس أي بيانات موجودة. الوصول من الخادم فقط (service role).
create table if not exists public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  resend_id text not null unique,
  org_id uuid references public.organizations(id) on delete set null,
  from_email text not null,
  from_name text,
  subject text,
  body text,
  status text not null default 'new' check (status in ('new','read','replied')),
  replied_at timestamptz,
  replied_by_name text,
  reply_body text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists inbound_emails_status_idx on public.inbound_emails(status, received_at desc);
create index if not exists inbound_emails_org_idx on public.inbound_emails(org_id, received_at desc);
alter table public.inbound_emails enable row level security;
revoke all on public.inbound_emails from anon, authenticated;
