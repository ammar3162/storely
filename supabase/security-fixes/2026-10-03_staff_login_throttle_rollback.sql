drop function if exists public.staff_login_ok(text);
drop function if exists public.staff_login_locked(text);
drop function if exists public.staff_login_fail(text, integer, integer);
drop table if exists public.staff_login_attempts;
notify pgrst, 'reload schema';
