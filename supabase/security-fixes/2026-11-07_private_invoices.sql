-- صور الفواتير والإيصالات والمهام تصير خاصة: الرابط المباشر ما يفتح لأحد.
-- تنفتح عن طريق /api/file بعد التحقق إن الشخص من نفس المنشأة (المالك/المدير، الموظف، المحاسب المربوط).
-- الشعارات تنتقل لمجلد عام جديد (org-logos) لأنها لازم تطلع للموظفين والمحاسب والإيميلات.
-- نسخ الشعارات الموجودة وتحديث organizations.logo_url يصير بسكربت scripts/migrate-org-logos.mjs بعد هذا الملف.
-- ما فيه حذف لأي ملف أو بيانات. الروابط المحفوظة في الفواتير ما تتغيّر.
begin;
insert into storage.buckets (id, name, public) values ('org-logos', 'org-logos', true)
on conflict (id) do update set public = true;

-- رفع الشعار: المالك/المدير لمجلد منشأته بس (نفس سياسة مجلد الفواتير)
drop policy if exists org_folder_logos_insert on storage.objects;
create policy org_folder_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'org-logos' and (storage.foldername(name))[1] = (select my_org_id())::text);
drop policy if exists org_folder_logos_update on storage.objects;
create policy org_folder_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'org-logos' and (storage.foldername(name))[1] = (select my_org_id())::text)
  with check (bucket_id = 'org-logos' and (storage.foldername(name))[1] = (select my_org_id())::text);
drop policy if exists org_folder_logos_select on storage.objects;
create policy org_folder_logos_select on storage.objects for select to authenticated
  using (bucket_id = 'org-logos' and (storage.foldername(name))[1] = (select my_org_id())::text);

-- مجلد الفواتير خاص
update storage.buckets set public = false where id = 'invoices';
commit;
