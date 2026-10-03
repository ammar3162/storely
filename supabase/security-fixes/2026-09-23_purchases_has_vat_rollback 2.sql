-- ============================================================================
-- التراجع عن 2026-09-23_purchases_has_vat.sql
-- ============================================================================
-- ⚠️ شغّله فقط بعد إرجاع الكود لنسخة ما ترسل has_vat (وإلا حفظ الفواتير يفشل).
-- الفواتير اللي انحفظت "بدون ضريبة" بعد التعديل راح ترجع تنحسب عليها 15% كالسابق.
-- ============================================================================

begin;

alter table public.purchases alter column vat_amount set expression as (round(amount * 0.15, 2));
alter table public.purchases alter column total_amount set expression as (round(amount * 1.15, 2));
alter table public.purchases drop column if exists has_vat;

commit;
