alter table public.organizations drop constraint if exists organizations_late_penalty_per_hour_range;
alter table public.organizations drop constraint if exists organizations_late_grace_range;
alter table public.organizations drop column if exists late_penalty_per_hour;
alter table public.organizations drop column if exists late_grace_minutes;
notify pgrst, 'reload schema';
