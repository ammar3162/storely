-- ١) رقم واتساب مدير الفرع للتقرير الصباحي (اختياري — منفصل عن phone عشان ما يتعارض مع دخول المالك وبوت الواتساب)
alter table public.profiles add column if not exists report_whatsapp text;

-- ٢) سجل أسئلة المساعد الذكي — يطلع للأدمن عشان يعرف وش يسأل العملاء
create table if not exists public.assistant_questions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid,
  role text,
  branch_id uuid,
  question text not null,
  reply text,
  sections text[],
  created_at timestamptz not null default now()
);
create index if not exists assistant_questions_created_idx on public.assistant_questions (created_at desc);
create index if not exists assistant_questions_org_idx on public.assistant_questions (org_id, created_at desc);
-- قراءة وكتابة من الخادم بس (service role) — ما فيه سياسات للمتصفح
alter table public.assistant_questions enable row level security;
