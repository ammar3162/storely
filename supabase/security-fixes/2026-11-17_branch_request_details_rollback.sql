-- رجوع عن 2026-11-17_branch_request_details.sql
-- تنبيه: يمسح تفاصيل طلبات الفروع (الاسم والخدمات). الطلبات نفسها تبقى، والفروع المنشأة ما تتأثر.
-- الأفضل لو صارت مشكلة: نرجّع الكود بس ونخلي العمود (الكود القديم ما يقراه)
alter table public.addon_requests drop constraint if exists addon_requests_details_check;
alter table public.addon_requests drop column if exists details;
