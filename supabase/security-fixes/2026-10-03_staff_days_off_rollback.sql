alter table public.staff_attendance drop column if exists on_day_off;
alter table public.staff_members drop constraint if exists staff_members_weekly_off_days_chk;
alter table public.staff_members drop column if exists weekly_off_days;
notify pgrst, 'reload schema';
