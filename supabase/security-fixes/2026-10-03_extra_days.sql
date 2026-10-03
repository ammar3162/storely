-- اليوم الإضافي (دوام بيوم الإجازة) يحتاج قرار المالك: تعويض مالي أو يوم بديل أو رفض.
-- والإجازة إما أيام ثابتة بالأسبوع أو رصيد أيام بالشهر (مرن).

-- نوع الإجازة لكل موظف
alter table public.staff_members add column if not exists days_off_mode text not null default 'weekly';
alter table public.staff_members add column if not exists monthly_off_days smallint not null default 0;
alter table public.staff_members drop constraint if exists staff_members_days_off_mode_chk;
alter table public.staff_members add constraint staff_members_days_off_mode_chk check (days_off_mode in ('weekly','monthly'));
alter table public.staff_members drop constraint if exists staff_members_monthly_off_days_chk;
alter table public.staff_members add constraint staff_members_monthly_off_days_chk check (monthly_off_days between 0 and 15);

-- الأيام الإضافية وقرار المالك فيها
create table if not exists public.staff_extra_days (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff_members(id) on delete cascade,
  attendance_id uuid unique references public.staff_attendance(id) on delete set null,
  work_date date not null,
  reason text not null default 'weekly' check (reason in ('weekly','monthly')),
  status text not null default 'pending' check (status in ('pending','paid','comp','rejected')),
  amount numeric(10,2) check (amount is null or amount > 0),
  comp_date date,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_extra_days_org_status on public.staff_extra_days (org_id, status, work_date desc);
create index if not exists idx_extra_days_staff on public.staff_extra_days (staff_id, work_date);
alter table public.staff_extra_days enable row level security;
revoke all on public.staff_extra_days from anon, authenticated;

-- مكافأة (تعويض اليوم الإضافي) تنضاف للراتب
alter table public.staff_payroll_adjustments drop constraint if exists staff_payroll_adjustments_type_check;
alter table public.staff_payroll_adjustments add constraint staff_payroll_adjustments_type_check check (type in ('deduction','advance','bonus'));

notify pgrst, 'reload schema';
