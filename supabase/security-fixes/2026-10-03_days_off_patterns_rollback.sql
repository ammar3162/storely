update public.staff_members set days_off_mode = 'weekly' where days_off_mode in ('biweekly','dates');
alter table public.staff_members drop constraint if exists staff_members_off_dates_len_chk;
alter table public.staff_members drop constraint if exists staff_members_days_off_mode_chk;
alter table public.staff_members add constraint staff_members_days_off_mode_chk check (days_off_mode in ('weekly','monthly'));
alter table public.staff_members drop column if exists off_dates;
alter table public.staff_members drop column if exists biweekly_anchor;
notify pgrst, 'reload schema';
