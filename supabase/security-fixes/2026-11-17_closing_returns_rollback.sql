-- رجوع عن 2026-11-17_closing_returns.sql
-- تنبيه: يمسح المرتجعات المسجّلة بالإقفالات (أرقامها وروابط صورها). الصور نفسها تبقى في مجلد invoices.
-- الأفضل لو صارت مشكلة: نرجّع الكود بس ونخلي العمود (ما يضر الكود القديم لأنه ما يقراه)
alter table public.cashier_closings drop constraint if exists cashier_closings_returns_check;
alter table public.cashier_closings drop column if exists returns;
