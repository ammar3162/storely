-- 2026-11-08: المالك عدّل بعد مقارنة القيمة: المشتريات 44←35 (والكاشير 30←39 بالكود فقط، lib/planPricing). سعر العرض بالمتجر.
-- على الإنتاج: 2026-11-07_custom_plan.sql صار يدخل 35 مباشرة، فهذا للاستيجنق بس.
update marketplace_addons set monthly_price = 35 where slug = 'mod_purchases';
