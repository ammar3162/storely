-- حماية رمز PIN من التخمين: عدّاد المحاولات الغلط بقاعدة البيانات (مو بذاكرة السيرفر اللي تنمسح
-- وتتوزّع على أكثر من نسخة). بعد 5 محاولات غلط خلال 15 دقيقة يتقفل المفتاح 15 دقيقة، ويتضاعف مع التكرار (حد أقصى 24 ساعة).
create table if not exists public.staff_login_attempts (
  key text primary key,                 -- phone:<رقم> | staff:<id> | ip:<عنوان>
  fail_count integer not null default 0,
  first_fail_at timestamptz,
  locked_until timestamptz,
  lock_level integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.staff_login_attempts enable row level security;  -- بدون سياسات: السيرفر (service role) بس
revoke all on public.staff_login_attempts from anon, authenticated;

-- يسجّل محاولة غلط بشكل ذرّي ويرجّع وقت انتهاء القفل (null = ما انقفل) و just_locked
create or replace function public.staff_login_fail(p_key text, p_max integer default 5, p_window_minutes integer default 15)
returns table(locked_until timestamptz, just_locked boolean)
language plpgsql
as $$
declare r public.staff_login_attempts;
begin
  insert into public.staff_login_attempts as a (key, fail_count, first_fail_at, updated_at)
  values (p_key, 1, now(), now())
  on conflict (key) do update set
    fail_count = case when a.first_fail_at is null or a.first_fail_at < now() - make_interval(mins => p_window_minutes) then 1 else a.fail_count + 1 end,
    first_fail_at = case when a.first_fail_at is null or a.first_fail_at < now() - make_interval(mins => p_window_minutes) then now() else a.first_fail_at end,
    updated_at = now()
  returning * into r;

  if r.fail_count >= p_max then
    update public.staff_login_attempts
      set locked_until = now() + least(make_interval(mins => 15 * (2 ^ r.lock_level)::int), interval '24 hours'),
          lock_level = r.lock_level + 1, fail_count = 0, first_fail_at = null
      where key = p_key
      returning * into r;
    return query select r.locked_until, true;
  else
    return query select (case when r.locked_until > now() then r.locked_until else null end), false;
  end if;
end $$;

-- قفل مستمر؟ (يرجّع وقت انتهاء القفل أو null)
create or replace function public.staff_login_locked(p_key text)
returns timestamptz language sql stable as $$
  select locked_until from public.staff_login_attempts where key = p_key and locked_until > now()
$$;

-- دخول ناجح: نمسح العدّاد (ونخلي مستوى القفل يرجع للأساس)
create or replace function public.staff_login_ok(p_key text)
returns void language sql as $$
  delete from public.staff_login_attempts where key = p_key
$$;

revoke all on function public.staff_login_fail(text, integer, integer) from anon, authenticated, public;
revoke all on function public.staff_login_locked(text) from anon, authenticated, public;
revoke all on function public.staff_login_ok(text) from anon, authenticated, public;
grant execute on function public.staff_login_fail(text, integer, integer) to service_role;
grant execute on function public.staff_login_locked(text) to service_role;
grant execute on function public.staff_login_ok(text) to service_role;
notify pgrst, 'reload schema';
