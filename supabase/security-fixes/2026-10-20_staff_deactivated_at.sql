-- 2026-10-20 تاريخ إيقاف الموظف — عشان راتب الشهر اللي ترك فيه ينحسب بنسبة أيامه ويظهر للمحاسب
-- ينكتب تلقائياً من قاعدة البيانات أول ما يتوقف الموظف (من أي مسار)، وينمسح لو رجع
begin;
alter table public.staff_members add column if not exists deactivated_at timestamptz;

create or replace function public.staff_deactivated_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.is_active is distinct from old.is_active then
    new.deactivated_at := case when new.is_active then null else now() end;
  end if;
  return new;
end $$;

drop trigger if exists trg_staff_deactivated_stamp on public.staff_members;
create trigger trg_staff_deactivated_stamp before update of is_active on public.staff_members
  for each row execute function public.staff_deactivated_stamp();

revoke execute on function public.staff_deactivated_stamp() from public, anon, authenticated;
commit;
