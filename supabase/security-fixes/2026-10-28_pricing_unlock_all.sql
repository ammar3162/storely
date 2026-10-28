-- قرار المالك (28 أكتوبر 2026): الأسعار الجديدة على كل العملاء — نشيل تثبيت الأسعار القديمة.
-- الحقول نفسها تبقى (فاضية) عشان لو احتجنا تثبيت لعميل معيّن مستقبلاً.
update public.org_addon_subscriptions set locked_price = null where locked_price is not null;
update public.organizations set locked_plan_monthly = null where locked_plan_monthly is not null;
