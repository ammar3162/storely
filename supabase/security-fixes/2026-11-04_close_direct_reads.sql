-- إغلاق القراءة المباشرة من Supabase لبيانات المنشأة (تكملة التحقق من الجهاز)
-- المتصفح ما يقرأ هذي الجداول من بعد فصل الواجهة عن الخادم — كل القراءة تمر من /api وتتحقق من الجهاز.
-- بدون هذا: كلمة مرور مسروقة + JWT تقرأ المنتجات والمشتريات والإقفالات مباشرة من REST وتتجاوز رمز الجهاز.
-- يبقى: ملف المستخدم نفسه (read_own_profile)، والإشعارات ورسائل السوق (Realtime)، وسياسات الموردين والكتالوج العام.
-- ما يحذف أي بيانات — يحذف سياسات قراءة بس، والخادم يقرأ بمفتاح الخدمة.

drop policy if exists "users can manage their org branches_read" on public.branches;
drop policy if exists "org_branch_access_read" on public.cashier_closings;
drop policy if exists "org_read_own_reviews" on public.org_reviews;
drop policy if exists "organizations_own_only" on public.organizations;
drop policy if exists "org_branch_access_via_product_read" on public.product_suppliers;
drop policy if exists "org_branch_access_read" on public.products;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "org_branch_access_read" on public.purchases;
drop policy if exists "org members can manage recipe items_read" on public.recipe_items;
drop policy if exists "org members can view recipe items" on public.recipe_items;
drop policy if exists "org members can manage recipes_read" on public.recipes;
drop policy if exists "org members can view recipes" on public.recipes;
drop policy if exists "org_branch_access_read" on public.stock_movements;
drop policy if exists "org members view own supplier order logs" on public.supplier_order_logs;
drop policy if exists "org_branch_access_read" on public.supplier_orders;
drop policy if exists "org_branch_access_read" on public.suppliers;
drop policy if exists "logs_select" on public.whatsapp_logs;

notify pgrst, 'reload schema';
