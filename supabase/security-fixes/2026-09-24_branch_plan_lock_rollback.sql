-- استرجاع 2026-09-24_branch_plan_lock.sql (بعد إرجاع الكود القديم)
alter table branches      drop column if exists plan_locked_at;
alter table staff_members drop column if exists plan_locked_at;
