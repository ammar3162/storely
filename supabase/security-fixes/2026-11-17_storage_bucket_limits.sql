-- حدود مجلدات التخزين (نوع الملف وحجمه) — كانت مفتوحة لأي نوع وحجم، حتى المجلدات العامة (الشعارات وصور المنتجات)
-- فحص الإنتاج 2026-11-17: كل الملفات الحالية صور JPEG/PNG/WebP أو PDF، وأكبرها 4 ميجا → الحدود ما تأثر على شي موجود.
-- مجلدات النسخ الاحتياطي (backups, invoices-backup) داخلية بمفتاح الخدمة فقط — ما نلمسها.
update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf'], file_size_limit = 10485760 where id = 'invoices';
update storage.buckets set allowed_mime_types = array['application/pdf'], file_size_limit = 5242880 where id = 'invoice-pdfs';
update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'], file_size_limit = 5242880 where id in ('org-logos','partner-logos','supplier-items','shop-product-images');
