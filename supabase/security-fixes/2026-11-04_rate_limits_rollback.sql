-- رجوع: يشيل حد الطلبات (الكود يكمل يشتغل بدونه — rateLimit يسمح بالطلب لو الدالة مو موجودة)
drop function if exists public.rate_limit_hit(text, integer, integer);
drop table if exists public.rate_limits;
notify pgrst, 'reload schema';
