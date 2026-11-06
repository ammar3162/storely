-- سجل تكلفة الذكاء الاصطناعي: سطر لكل طلب لـ Anthropic (أي ميزة، أي منشأة) مع عدد التوكنز والتكلفة بالريال.
-- جدول جديد بس — ما يلمس أي بيانات موجودة. القراءة والكتابة من الخادم فقط (service_role).

create table if not exists public.ai_usage (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid references public.organizations(id) on delete cascade,  -- فاضي لو الطلب مو تابع لمنشأة
  feature            text        not null,   -- invoice_scan / invoice_agent / smart_insights / assistant / assistant_topic / translate_products / translate_tasks
  model              text        not null,
  input_tokens       integer     not null default 0,
  output_tokens      integer     not null default 0,
  cache_write_tokens integer     not null default 0,
  cache_read_tokens  integer     not null default 0,
  cost_sar           numeric(10,4) not null default 0,
  ok                 boolean     not null default true,   -- false لو رجع خطأ من Anthropic
  created_at         timestamptz not null default now()
);
create index if not exists ai_usage_org_created_idx on public.ai_usage (org_id, created_at desc);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);

alter table public.ai_usage enable row level security;  -- بدون سياسات: المتصفح ما يقدر يقرأ أو يكتب
revoke all on table public.ai_usage from anon, authenticated, public;
grant all on table public.ai_usage to service_role;
notify pgrst, 'reload schema';
