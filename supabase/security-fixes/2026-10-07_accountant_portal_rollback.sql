drop table if exists public.accountant_view_logs;
drop table if exists public.accountant_access;
drop table if exists public.accountant_login_codes;
drop table if exists public.accountant_users;
notify pgrst, 'reload schema';
