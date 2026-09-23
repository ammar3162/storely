-- ============================================================================
-- فواتير الشراء بدون ضريبة — 2026-09-23
-- ============================================================================
-- المشكلة: vat_amount و total_amount أعمدة محسوبة دايماً كـ amount × 0.15 و amount × 1.15،
-- فكل فاتورة شراء تنسجّل وكأنها شاملة ضريبة 15% حتى لو اختار المستخدم "بدون ضريبة"
-- (فاتورة 100 ر.س بدون ضريبة كانت تنحفظ 86.96 + 13.04 ضريبة).
--
-- الحل: عمود has_vat (افتراضي true) والضريبة تعتمد عليه.
-- كل الفواتير القديمة تاخذ true ← أرقامها ما تتغير أبداً (نفس المعادلة بالضبط).
-- لا يحذف ولا يعدّل أي مبلغ مسجّل.
--
-- الترتيب: شغّل هذا على قاعدة البيانات **قبل** نشر الكود اللي يرسل has_vat.
-- (الكود القديم يشتغل عادي بعده لأن القيمة الافتراضية true = نفس السلوك الحالي)
-- يتطلب PostgreSQL 17+ (ALTER COLUMN ... SET EXPRESSION).
-- ============================================================================

begin;

alter table public.purchases add column if not exists has_vat boolean not null default true;

alter table public.purchases alter column vat_amount
  set expression as (case when has_vat then round(amount * 0.15, 2) else 0 end);

alter table public.purchases alter column total_amount
  set expression as (case when has_vat then round(amount * 1.15, 2) else amount end);

commit;


-- ============================ التحقق ============================
-- المفروض كل الصفوف القديمة has_vat = true والأرقام نفسها:
-- select has_vat, count(*), sum(amount), sum(vat_amount), sum(total_amount) from public.purchases group by 1;
