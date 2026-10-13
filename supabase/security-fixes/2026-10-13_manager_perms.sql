-- صلاحيات مدير الفرع صارت تشمل الحضور، والرواتب والإجازات، والمنيو (كانت مفتوحة لكل مدير بدون صلاحية).
-- عشان ما يتغير شي على المديرين الحاليين: نعطيهم هالثلاث مفعّلة (والمالك يقدر يقفلها من صفحة مديري الفروع).
-- المفاتيح الموجودة أصلاً تبقى زي ما هي.
update public.profiles
set permissions = jsonb_build_object('attendance', true, 'hr', true, 'online_store', true) || coalesce(permissions, '{}'::jsonb)
where role = 'manager';
