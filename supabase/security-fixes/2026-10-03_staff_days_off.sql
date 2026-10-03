-- أيام الإجازة الأسبوعية لكل موظف (0=الأحد … 6=السبت). يوم إجازته ما ينحسب غياب،
-- ولو حضّر فيه يتسجّل «دوام يوم إجازة» (يوم إضافي) بدون تأخير.
alter table public.staff_members add column if not exists weekly_off_days smallint[] not null default '{}';
alter table public.staff_members drop constraint if exists staff_members_weekly_off_days_chk;
alter table public.staff_members add constraint staff_members_weekly_off_days_chk
  check (weekly_off_days <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(weekly_off_days) <= 6);
alter table public.staff_attendance add column if not exists on_day_off boolean not null default false;
notify pgrst, 'reload schema';
