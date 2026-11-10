-- رجوع: يشيل وحدات الشراء (الفواتير ترجع تُسجَّل بالكمية كما هي بدون تحويل)
drop table if exists public.product_units;
notify pgrst, 'reload schema';
