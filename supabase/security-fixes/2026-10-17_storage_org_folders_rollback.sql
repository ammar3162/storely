-- تراجع 2026-10-17_storage_org_folders: يرجّع سياسات التخزين كما كانت بالضبط
begin;
drop policy if exists "org_folder_invoices_insert" on storage.objects;
drop policy if exists "org_folder_invoices_update" on storage.objects;
drop policy if exists "org_folder_invoices_select" on storage.objects;
drop policy if exists "org_folder_shop_images_insert" on storage.objects;
drop policy if exists "org_folder_shop_images_update" on storage.objects;
drop policy if exists "org_folder_shop_images_select" on storage.objects;
create policy "public_read_invoices_bucket" on storage.objects for select to public using (bucket_id = 'invoices');
create policy "authenticated_update_invoices_bucket" on storage.objects for update to authenticated using (bucket_id = 'invoices');
create policy "authenticated_upload_invoices_bucket" on storage.objects for insert to authenticated with check (bucket_id = 'invoices');
create policy "authenticated_upload_shop_images" on storage.objects for insert to authenticated with check (bucket_id = 'shop-product-images');
create policy "public_read_shop_images" on storage.objects for select to public using (bucket_id = 'shop-product-images');
create policy "public_read_supplier_items" on storage.objects for select to public using (bucket_id = 'supplier-items');
commit;
