-- انصراف يدوي بطلب المالك (ÉTER CAFÉ — خالد): طلع من الفرع بدون ما يسجّل انصراف.
-- سطر انصراف واحد الساعة 9:00 م (نهاية شفت الجمعة)، مستأذن، بدون أوفر تايم. ما يتعدّل أي سطر ثاني.
-- يتضاف بس لو ما فيه انصراف بعد حضور اليوم.
insert into public.staff_attendance (org_id, branch_id, staff_id, staff_name, type, recorded_at, is_excused, overtime_minutes, within_range)
select ci.org_id, ci.branch_id, ci.staff_id, ci.staff_name, 'check_out', timestamptz '2026-10-30 21:00:00+03', true, 0, false
from public.staff_attendance ci
where ci.staff_id = '095c4906-98d4-4bc5-9fdf-932decc11944' and ci.type = 'check_in'
  and ci.recorded_at = (select max(recorded_at) from public.staff_attendance where staff_id = ci.staff_id and type = 'check_in')
  and ci.recorded_at::date >= date '2026-10-30' - 1
  and not exists (select 1 from public.staff_attendance co where co.staff_id = ci.staff_id and co.type = 'check_out' and co.recorded_at > ci.recorded_at)
returning id, (recorded_at at time zone 'Asia/Riyadh')::text as at;
