-- ============================================================================
-- مطابقة سجل حركات المخزون مع الكمية المعروضة — 2026-09-23
-- ============================================================================
-- المشكلة: الـ trigger "after_stock_movement" يعيد حساب products.qty = مجموع كل حركات الصنف.
-- بعض الأصناف كميتها المعروضة ≠ مجموع حركاتها (بيانات قديمة / كتابة مباشرة للكمية بدون حركة).
-- فأول صرف يخلي المجموع سالب ← يرفضه القيد products_qty_check (qty >= 0) ← "تعذّر تسجيل الحركة".
--
-- الحل: حركة "تسوية" (adjustment) وحدة لكل صنف غير متطابق بقيمة الفرق،
-- بحيث يصير مجموع الحركات = الكمية المعروضة حالياً. **الكمية اللي يشوفها العميل ما تتغير.**
-- الـ triggers: تنبيهات النقص تشتغل على نوع 'out' فقط (ما تتأثر)، و sync يحسب نفس الكمية الحالية.
-- ============================================================================


-- ============================ 1) فحص (قراءة فقط) ============================
-- كم صنف غير متطابق؟
with ledger as (
  select product_id, sum(qty_change) as total from public.stock_movements group by product_id
)
select count(*) as mismatched_products,
       sum(abs(p.qty - coalesce(l.total, 0))) as total_difference
from public.products p
left join ledger l on l.product_id = p.id
where p.qty <> coalesce(l.total, 0);


-- ============================ 2) الإصلاح ============================
begin;

with ledger as (
  select product_id, sum(qty_change) as total from public.stock_movements group by product_id
)
insert into public.stock_movements (product_id, org_id, type, qty_change, note)
select p.id, p.org_id, 'adjustment', p.qty - coalesce(l.total, 0),
       'تسوية تلقائية: مطابقة سجل الحركات مع الكمية الحالية'
from public.products p
left join ledger l on l.product_id = p.id
where p.qty <> coalesce(l.total, 0);

commit;


-- ============================ 3) تحقق ============================
-- المفروض يرجع 0:
-- with ledger as (select product_id, sum(qty_change) total from public.stock_movements group by product_id)
-- select count(*) from public.products p left join ledger l on l.product_id = p.id where p.qty <> coalesce(l.total, 0);
