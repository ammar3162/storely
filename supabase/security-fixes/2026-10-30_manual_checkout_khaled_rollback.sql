-- تراجع: يحذف سطر الانصراف اليدوي بس
delete from public.staff_attendance
where staff_id = '095c4906-98d4-4bc5-9fdf-932decc11944' and type = 'check_out'
  and recorded_at = timestamptz '2026-10-30 21:00:00+03' and is_excused = true and within_range = false;
