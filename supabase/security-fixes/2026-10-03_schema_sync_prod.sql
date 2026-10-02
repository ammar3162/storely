-- مزامنة: أعمدة/جداول موجودة بـ staging (انضافت يدوياً) ويستخدمها الكود، وناقصة بالإنتاج.
-- كلها إضافات آمنة (if not exists) — تنطبق على الإنتاج قبل باقي تعديلات 2026-10-03.
alter table public.staff_attendance add column if not exists penalty_applied boolean default false;
alter table public.staff_members add column if not exists preferred_lang text default 'ar';
alter table public.staff_tasks add column if not exists is_daily boolean default false;
alter table public.staff_tasks add column if not exists template_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'staff_tasks_template_id_fkey') then
    alter table public.staff_tasks add constraint staff_tasks_template_id_fkey foreign key (template_id) references public.staff_tasks(id);
  end if;
end $$;

-- تحقق الأدمن بخطوتين (2FA)
create table if not exists public.admin_2fa_pending (
  token text primary key,
  admin_id uuid not null references public.admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
alter table public.admin_2fa_pending enable row level security;
revoke all on public.admin_2fa_pending from anon, authenticated;
notify pgrst, 'reload schema';
