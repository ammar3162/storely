-- رجوع: يشيل سجل تكلفة الذكاء (الكود يكمل يشتغل بدونه — logAiUsage يتجاهل أي خطأ في الحفظ)
drop table if exists public.ai_usage;
notify pgrst, 'reload schema';
