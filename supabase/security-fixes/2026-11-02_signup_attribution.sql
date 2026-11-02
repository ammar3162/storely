-- مصدر العميل وقت التسجيل (مهمة [5]): «من وين سمعت عنا؟» + رابط الحملة (utm)
-- جدول منفصل — ما يغيّر جدول organizations. صف واحد لكل منشأة.
create table if not exists public.signup_attribution (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  source text check (source in ('tiktok','snapchat','instagram','x','google','friend','agent','other')),
  source_detail text check (char_length(source_detail) <= 100),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  utm_content text check (char_length(utm_content) <= 100),
  utm_term text check (char_length(utm_term) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists signup_attribution_created_idx on public.signup_attribution (created_at desc);
-- قراءة وكتابة من الخادم بس (service role) — ما فيه سياسات للمتصفح
alter table public.signup_attribution enable row level security;
