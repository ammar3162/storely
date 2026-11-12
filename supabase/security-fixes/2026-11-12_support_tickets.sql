-- تذاكر الدعم الفني: العميل يطلب الدعم من المساعد الذكي (أو المساعد ما يعرف الجواب) → تذكرة فيها السياق كامل
-- (المنشأة، الصفحة، المحادثة) تظهر للإدارة في «صندوق الطلبات ← الدعم»، والرد يوصل العميل إشعاراً داخل النظام.
-- جدول جديد فقط — ما يلمس أي بيانات موجودة. الوصول من الخادم فقط (service role)، مثل باقي جداول الإدارة.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  requested_by uuid,
  requester_name text,
  requester_phone text,
  page text,
  subject text not null,
  conversation jsonb not null default '[]'::jsonb,
  source text not null default 'assistant' check (source in ('assistant','button')),
  status text not null default 'new' check (status in ('new','open','resolved')),
  admin_reply text,
  replied_at timestamptz,
  replied_by_name text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists support_tickets_number_idx on public.support_tickets(number);
create index if not exists support_tickets_status_idx on public.support_tickets(status, created_at desc);
create index if not exists support_tickets_org_idx on public.support_tickets(org_id, created_at desc);
alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon, authenticated;
