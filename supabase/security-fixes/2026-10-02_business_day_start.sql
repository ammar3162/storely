-- بداية «يوم العمل» لإقفال الكاشير: أي تقفيل قبل هالساعة (بتوقيت السعودية) ينحسب على اليوم اللي قبل
alter table public.organizations add column if not exists business_day_start_hour smallint not null default 4;
alter table public.organizations drop constraint if exists organizations_business_day_start_hour_range;
alter table public.organizations add constraint organizations_business_day_start_hour_range check (business_day_start_hour between 0 and 10);
notify pgrst, 'reload schema';
