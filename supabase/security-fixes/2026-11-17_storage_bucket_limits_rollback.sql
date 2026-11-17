update storage.buckets set allowed_mime_types = null, file_size_limit = null where id in ('invoices','invoice-pdfs','org-logos','supplier-items','shop-product-images');
-- partner-logos كان محدود على staging قبل (png/jpeg/webp، 2 ميجا) ومفتوح على الإنتاج — رجّعه حسب البيئة
update storage.buckets set allowed_mime_types = null, file_size_limit = null where id = 'partner-logos';
