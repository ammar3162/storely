-- التحقق من الجهاز: رمز على الإيميل عند التسجيل وعند الدخول من جهاز جديد (المالك ومدير الفرع)
-- جدولين جديدين + عمود تشغيل/إيقاف: ما تغيّر أي بيانات موجودة

-- الأجهزة الموثوقة لكل مستخدم (معرّف الجهاز محفوظ مشفّر، والأصل بكوكي المتصفح بس)
create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_hash)
);
create index if not exists idx_trusted_devices_user on public.trusted_devices (user_id, last_seen_at desc);
alter table public.trusted_devices enable row level security;
revoke all on public.trusted_devices from anon, authenticated, public;

-- رموز الدخول: الرمز مشفّر، صالح 10 دقايق، 5 محاولات
-- device_hash فاضي = رمز من فريق ستورلي يشتغل على أي جهاز (لما الإيميل ما يوصل)
create table if not exists public.login_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  device_hash text,
  source text not null default 'email',
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_codes_user on public.login_codes (user_id, created_at desc);
alter table public.login_codes enable row level security;
revoke all on public.login_codes from anon, authenticated, public;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'login_codes_source_check') then
    alter table public.login_codes add constraint login_codes_source_check check (source in ('email','admin'));
  end if;
end $$;

-- مفتاح التشغيل: false يوقف طلب الرمز فوراً بدون نشر
alter table public.platform_settings add column if not exists device_verification boolean not null default true;

notify pgrst, 'reload schema';
