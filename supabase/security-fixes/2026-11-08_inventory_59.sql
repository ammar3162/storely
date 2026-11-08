-- 2026-11-08: المالك رفع المخزون 49←59. سعر العرض بالمتجر (الحساب من lib/planPricing). على الإنتاج: 2026-11-07_custom_plan.sql صار يدخل 59 مباشرة، فهذا للاستيجنق بس.
update marketplace_addons set monthly_price = 59 where slug = 'mod_inventory';
