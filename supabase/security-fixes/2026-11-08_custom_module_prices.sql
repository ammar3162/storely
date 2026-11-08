-- 2026-11-08: رفع الباقات (129/169/239) — «ابنِ باقتك»: المخزون 69←75 والمشتريات 50←54
-- (المخزون + المشتريات = سعر «الأساسية»). الأسعار المحسوبة بالكود من lib/planPricing؛ هذا للعرض بالمتجر.
-- على الإنتاج: ملف 2026-11-07_custom_plan.sql صار يدخل 75/54 مباشرة، فهذا الملف للاستيجنق بس.
update marketplace_addons set monthly_price = 75 where slug = 'mod_inventory';
update marketplace_addons set monthly_price = 54 where slug = 'mod_purchases';
