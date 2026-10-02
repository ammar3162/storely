-- كشف الراتب: غرامات التأخير تنخصم تلقائياً (مع إمكانية الإلغاء)، الأوفر تايم يتثبّت وقت الانصراف،
-- وعجز الكاشير يحتاج اعتماد المالك قبل ما ينخصم.

-- الحضور
alter table public.staff_attendance add column if not exists penalty_waived boolean not null default false;
alter table public.staff_attendance add column if not exists overtime_minutes integer;
alter table public.staff_attendance drop constraint if exists staff_attendance_overtime_minutes_range;
alter table public.staff_attendance add constraint staff_attendance_overtime_minutes_range check (overtime_minutes is null or overtime_minutes between 0 and 1440);

-- قرار المالك على عجز الإقفال (null = إقفال قديم قبل الميزة، ما ينخصم)
alter table public.cashier_closings add column if not exists deficit_decision text;
alter table public.cashier_closings add column if not exists deficit_decided_at timestamptz;
alter table public.cashier_closings drop constraint if exists cashier_closings_deficit_decision_chk;
alter table public.cashier_closings add constraint cashier_closings_deficit_decision_chk check (deficit_decision is null or deficit_decision in ('pending','approved','rejected'));

-- مصدر الخصم (عشان نترجم نوعه ونمنع خصم نفس العجز مرتين)
alter table public.staff_payroll_adjustments add column if not exists source text;
alter table public.staff_payroll_adjustments add column if not exists source_id uuid;
create unique index if not exists staff_payroll_adjustments_source_uniq on public.staff_payroll_adjustments (source, source_id) where source is not null;

-- إشعار مربوط بعنصر (لأزرار الاعتماد/الرفض)
alter table public.notifications add column if not exists ref_type text;
alter table public.notifications add column if not exists ref_id uuid;

notify pgrst, 'reload schema';
