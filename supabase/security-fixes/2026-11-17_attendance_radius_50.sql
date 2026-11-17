-- نطاق تسجيل الحضور: 50 متر في كل البيئات (قرار المالك 2026-11-17: «50 في الإنتاج والاستيجن»، للفروع الجديدة والحالية).
-- قبل التغيير: الإنتاج افتراضيه 150 وكل فروعه الـ 24 على 150 (ما فيه واجهة تغيّره، فكلها من الافتراضي)، والاستيجن 50.
-- الكود يضيف فوق النطاق سماحية دقة الموقع (موقع الفرع حتى 150 متر + جوال الموظف حتى 40 متر) — app/api/staff-attendance.
-- يغيّر قيمة النطاق فقط، ما يحذف شي. التراجع: 2026-11-17_attendance_radius_50_rollback.sql
alter table public.branches alter column attendance_radius_m set default 50;
update public.branches set attendance_radius_m = 50 where attendance_radius_m = 150;
