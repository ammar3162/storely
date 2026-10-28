-- يرجّع الأسعار القديمة ويشيل التثبيت
update public.marketplace_addons set monthly_price = 49 where slug = 'extra_branch';
update public.marketplace_addons set monthly_price = 5  where slug = 'extra_staff';
update public.marketplace_addons set monthly_price = 20 where slug in ('hr_full', 'cashier_closing', 'profitability', 'ai_tools');
update public.marketplace_addons set monthly_price = 39 where slug = 'online_menu';
alter table public.org_addon_subscriptions drop column if exists locked_price;
alter table public.organizations drop column if exists locked_plan_monthly;
