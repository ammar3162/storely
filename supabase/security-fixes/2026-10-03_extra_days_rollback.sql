alter table public.staff_payroll_adjustments drop constraint if exists staff_payroll_adjustments_type_check;
alter table public.staff_payroll_adjustments add constraint staff_payroll_adjustments_type_check check (type in ('deduction','advance'));
drop table if exists public.staff_extra_days;
alter table public.staff_members drop constraint if exists staff_members_monthly_off_days_chk;
alter table public.staff_members drop constraint if exists staff_members_days_off_mode_chk;
alter table public.staff_members drop column if exists monthly_off_days;
alter table public.staff_members drop column if exists days_off_mode;
notify pgrst, 'reload schema';
