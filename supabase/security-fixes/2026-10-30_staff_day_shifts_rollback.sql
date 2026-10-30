-- تراجع: يشيل شفتات الأيام (الموظفين يرجعون على شفتهم الأساسي بس). سجلات الحضور ما تتأثر — الشفت متثبّت فيها وقت الحضور.
alter table public.staff_members drop constraint if exists staff_members_weekday_shifts_obj;
alter table public.staff_members drop constraint if exists staff_members_date_shifts_obj;
alter table public.staff_members drop column if exists weekday_shifts;
alter table public.staff_members drop column if exists date_shifts;
