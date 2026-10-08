alter table public.accountant_access drop column if exists expires_on;
drop table if exists public.accountant_sessions;
notify pgrst, 'reload schema';
