-- 2026-11-08: المالك نقّص المشتريات 54←44. سعر العرض بالمتجر (الحساب من lib/planPricing). على الإنتاج: 2026-11-07_custom_plan.sql صار يدخل 44 مباشرة، فهذا للاستيجنق بس.
update marketplace_addons set monthly_price = 44 where slug = 'mod_purchases';
