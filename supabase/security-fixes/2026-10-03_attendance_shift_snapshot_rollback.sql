alter table public.staff_attendance drop column if exists shift_is_24h;
alter table public.staff_attendance drop column if exists shift_end_time;
alter table public.staff_attendance drop column if exists shift_start_time;
notify pgrst, 'reload schema';
