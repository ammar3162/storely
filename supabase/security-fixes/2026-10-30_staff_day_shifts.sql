-- شفتات حسب اليوم: لكل موظف شفت أساسي (shift_id) + شفت مختلف لأيام أسبوع معيّنة أو تواريخ محددة.
-- الأولوية: التاريخ المحدد ← يوم الأسبوع ← الشفت الأساسي.
--   weekday_shifts: {"5": "<shift uuid>"}          (0 = الأحد … 6 = السبت)
--   date_shifts:    {"2026-11-06": "<shift uuid>"}
-- إضافة فقط: ما ينحذف شي، وكل الموظفين الحاليين يبدأون بقيمة فاضية {} = يمشون على شفتهم الأساسي مثل قبل.
alter table public.staff_members
  add column if not exists weekday_shifts jsonb not null default '{}'::jsonb,
  add column if not exists date_shifts jsonb not null default '{}'::jsonb;

alter table public.staff_members drop constraint if exists staff_members_weekday_shifts_obj;
alter table public.staff_members add constraint staff_members_weekday_shifts_obj check (jsonb_typeof(weekday_shifts) = 'object');
alter table public.staff_members drop constraint if exists staff_members_date_shifts_obj;
alter table public.staff_members add constraint staff_members_date_shifts_obj check (jsonb_typeof(date_shifts) = 'object');
