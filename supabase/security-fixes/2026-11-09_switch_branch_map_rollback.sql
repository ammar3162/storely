-- رجوع: يشيل عمود الفروع لكل ميزة (الاختيارات ترجع تنحسب على كل الفروع النشطة)
alter table public.pricing_switches drop column if exists branch_map;
notify pgrst, 'reload schema';
