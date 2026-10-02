alter table public.organizations drop column if exists late_auto_from;
notify pgrst, 'reload schema';
