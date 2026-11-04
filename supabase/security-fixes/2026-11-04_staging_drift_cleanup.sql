-- STAGING فقط — تنظيف بقايا ميزة الوصفات القديمة (انلغت في c13f9e50 / 7f5d3a5f) عشان يطابق staging الإنتاج.
-- الإنتاج ما فيه هذي الأشياء أصلاً، والكود الحالي ما يستخدمها. لا يُطبّق على الإنتاج.
-- البيانات اللي تنحذف: بيانات تجربة بس (سطر واحد في recipe_sales_log، وعلامة is_recipe على منتج تجربة واحد — المنتج نفسه يبقى).

drop table if exists public.recipe_sales_log;
alter table public.products drop column if exists is_recipe;
alter table public.products drop column if exists allow_direct_dispense;
-- نفس نوع الإنتاج (character varying) — بدون تغيير بالسلوك
alter table public.bot_sent_messages alter column message_id type character varying;
notify pgrst, 'reload schema';
