-- 2026-10-17 حماية ملفات التخزين
-- المشكلة:
--   • invoices: أي زائر (بدون دخول) يقدر يعرض قائمة كل ملفات الفواتير لكل العملاء (سياسة SELECT عامة)
--   • invoices: أي مستخدم مسجّل يقدر يستبدل (UPDATE) ملف فاتورة منشأة ثانية
--   • shop-product-images / supplier-items: قائمة الملفات مفتوحة للجميع، ورفع صور المنيو بدون تقييد بالمنشأة
-- الحل: كل منشأة ترفع وتعدّل داخل مجلدها {org_id}/ بس، وما فيه عرض قائمة عام.
-- الروابط العامة (getPublicUrl) تبقى شغالة لأن الحاويات public — ما تحتاج سياسة SELECT.
-- الرفع من الخادم (service_role) ما يتأثر.
begin;

drop policy if exists "public_read_invoices_bucket" on storage.objects;
drop policy if exists "authenticated_update_invoices_bucket" on storage.objects;
drop policy if exists "authenticated_upload_invoices_bucket" on storage.objects;
drop policy if exists "authenticated_upload_shop_images" on storage.objects;
drop policy if exists "public_read_shop_images" on storage.objects;
drop policy if exists "public_read_supplier_items" on storage.objects;
-- موجودة بالإنتاج فقط: رفع وقراءة الفواتير لأي زائر (حتى بدون دخول)
drop policy if exists "allow read" on storage.objects;
drop policy if exists "allow upload" on storage.objects;

-- الفواتير والشعارات: مجلد المنشأة بس
create policy "org_folder_invoices_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = (select public.my_org_id())::text);
create policy "org_folder_invoices_update" on storage.objects for update to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = (select public.my_org_id())::text)
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = (select public.my_org_id())::text);
create policy "org_folder_invoices_select" on storage.objects for select to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = (select public.my_org_id())::text);

-- صور المنيو: مجلد المنشأة بس
create policy "org_folder_shop_images_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-product-images' and (storage.foldername(name))[1] = (select public.my_org_id())::text);
create policy "org_folder_shop_images_update" on storage.objects for update to authenticated
  using (bucket_id = 'shop-product-images' and (storage.foldername(name))[1] = (select public.my_org_id())::text)
  with check (bucket_id = 'shop-product-images' and (storage.foldername(name))[1] = (select public.my_org_id())::text);
create policy "org_folder_shop_images_select" on storage.objects for select to authenticated
  using (bucket_id = 'shop-product-images' and (storage.foldername(name))[1] = (select public.my_org_id())::text);

commit;
