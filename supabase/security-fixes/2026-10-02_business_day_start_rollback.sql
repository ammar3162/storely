alter table public.organizations drop constraint if exists organizations_business_day_start_hour_range;
alter table public.organizations drop column if exists business_day_start_hour;
notify pgrst, 'reload schema';
