-- التراجع: حذف العمود (يفقد تواريخ البداية المسجّلة بعد التطبيق فقط — لا يمس أي بيانات أخرى)
alter table public.staff_members drop column if exists employment_start;
