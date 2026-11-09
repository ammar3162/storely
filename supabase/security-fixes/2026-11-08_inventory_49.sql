-- 2026-11-08: المالك نقّص المخزون 59←49 (وإقفال الكاشير 40←30 بالكود بس — سعر marketplace_addons للكاشير للمشتركين القدامى ما يتغيّر).
-- الأسعار المحسوبة من lib/planPricing؛ هذا سعر العرض بالمتجر. على الإنتاج: 2026-11-07_custom_plan.sql صار يدخل 49 مباشرة، فهذا للاستيجنق بس.
update marketplace_addons set monthly_price = 49 where slug = 'mod_inventory';
