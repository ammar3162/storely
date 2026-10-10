-- فيديوهات الشرح: لكل صفحة فيديو يوتيوب (تضيفه الإدارة بس). منفصل تماماً عن بيانات العملاء
create table if not exists public.help_videos (
  page_key text primary key check (page_key ~ '^/[a-z0-9/-]{1,60}$'),
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text check (title is null or char_length(title) <= 80),
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.help_videos enable row level security;
revoke all on public.help_videos from anon, authenticated;
notify pgrst, 'reload schema';
