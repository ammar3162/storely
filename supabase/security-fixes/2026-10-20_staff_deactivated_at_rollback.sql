-- تراجع 2026-10-20_staff_deactivated_at
begin;
drop trigger if exists trg_staff_deactivated_stamp on public.staff_members;
drop function if exists public.staff_deactivated_stamp();
alter table public.staff_members drop column if exists deactivated_at;
commit;
