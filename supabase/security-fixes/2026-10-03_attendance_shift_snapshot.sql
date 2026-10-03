-- الشفت يتثبّت وقت الحضور: لو المالك غيّر شفت الموظف وهو داخل دوامه، يكمل دوامه على الشفت اللي حضر عليه
alter table public.staff_attendance add column if not exists shift_start_time time;
alter table public.staff_attendance add column if not exists shift_end_time time;
alter table public.staff_attendance add column if not exists shift_is_24h boolean;
notify pgrst, 'reload schema';
