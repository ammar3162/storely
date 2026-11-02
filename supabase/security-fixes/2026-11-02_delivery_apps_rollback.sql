-- رجوع عن 2026-11-02_delivery_apps.sql (يمسح قائمة التطبيقات ومبالغ التوصيل المسجّلة بالإقفالات)
-- تنبيه: الإقفالات اللي فيها توصيل يبقى فرقها المحفوظ (difference) محسوب على التوصيل — راجعها قبل الرجوع
alter table public.cashier_closings drop constraint if exists cashier_closings_delivery_check;
alter table public.organizations drop constraint if exists organizations_delivery_apps_check;
alter table public.cashier_closings
  drop column if exists delivery_amount,
  drop column if exists delivery;
alter table public.organizations drop column if exists delivery_apps;
