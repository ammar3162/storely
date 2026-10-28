-- يرجّع التثبيت كما كان قبل الإلغاء (الإنتاج: القيم المسجّلة يوم 28 أكتوبر 2026)
update public.org_addon_subscriptions s set locked_price = a.old_price
  from (values ('extra_staff', 5.00), ('cashier_closing', 20.00), ('hr_full', 20.00), ('online_menu', 39.00)) as a(slug, old_price),
       public.marketplace_addons m
 where m.id = s.addon_id and m.slug = a.slug and s.status = 'active'
   and s.org_id in (select o.id from public.organizations o where o.name in ('HATABA BURGER RESTAURANT','yucca','رواد التجاريه','شاي بكره','ETER CAFE'));
update public.organizations set locked_plan_monthly = 399 where name = 'Bold Burger';
