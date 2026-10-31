-- رجوع عن 2026-10-31_new_plans.sql
begin;

update marketplace_addons set name = 'إدارة الموظفين الكاملة', monthly_price = 39,
  description = 'الحضور والانصراف بالموقع الجغرافي + الرواتب والسلف والإجازات وإقفال الكاشير'
where slug = 'hr_full';

-- profit_ai يتوقف عن البيع (ما نمسحه لو فيه اشتراكات عليه)
update marketplace_addons set is_active = false where slug = 'profit_ai';
delete from marketplace_addons a where a.slug = 'profit_ai'
  and not exists (select 1 from org_addon_subscriptions s where s.addon_id = a.id);

update marketplace_addons set is_active = true where slug in ('profitability', 'ai_tools', 'online_menu');

update marketplace_addons set description = 'أضف موظف واحد أو أكثر فوق حد باقتك — 5 ر.س لكل موظف شهرياً' where slug = 'extra_staff';
update marketplace_addons set description = 'أضف مورد واحد أو أكثر فوق حد باقتك — 5 ر.س لكل مورد شهرياً' where slug = 'extra_suppliers';
update marketplace_addons set description = 'أضف فرع واحد إضافي فوق حد باقتك' where slug = 'extra_branch';

-- locked_price اللي انضاف لمشتركي hr_full يبقى (يساوي سعرهم القديم 39) — ما يغيّر فواتيرهم

commit;
