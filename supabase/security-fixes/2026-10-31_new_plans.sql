-- الباقات الجديدة (الأساسية / الشاملة / المتقدمة / المؤسسات) — بيانات الإضافات فقط، بدون تغيير بالجداول
-- ما يمسح أي بيانات: الإضافات القديمة تتوقف عن البيع (is_active=false) واشتراكاتها السارية تبقى شغالة
begin;

-- ١) المشتركين الحاليين في «إدارة الموظفين» يكملون على 39 لين تجديد اشتراكهم (التجديد يفك التثبيت — PRICE_UPDATE_ON_RENEWAL)
update org_addon_subscriptions s set locked_price = a.monthly_price
from marketplace_addons a
where a.id = s.addon_id and a.slug = 'hr_full' and s.status = 'active' and s.locked_price is null;

-- ٢) «إدارة الموظفين» صارت 59
update marketplace_addons set name = 'إدارة الموظفين', monthly_price = 59,
  description = 'الحضور والانصراف بالموقع، الشفتات، الرواتب والسلف والإجازات'
where slug = 'hr_full';

-- ٣) حزمة «الأرباح والذكاء» 69 بدل إضافتي الربحية والذكاء
insert into marketplace_addons (slug, name, description, icon, monthly_price, is_active, sort_order)
select 'profit_ai', 'الأرباح والذكاء', 'الربحية والمصروفات، قرارات اليوم، الطلب الذكي، ومسح الفواتير بالذكاء الاصطناعي', '📈', 69, true, 20
where not exists (select 1 from marketplace_addons where slug = 'profit_ai');

update marketplace_addons set is_active = false where slug in ('profitability', 'ai_tools', 'online_menu');

-- ٤) تصحيح وصف الموظف/المورد الإضافي (كان مكتوب سعر غلط)
update marketplace_addons set description = 'أضف موظف أو أكثر فوق حد باقتك' where slug = 'extra_staff';
update marketplace_addons set description = 'أضف مورد أو أكثر فوق حد باقتك' where slug = 'extra_suppliers';
update marketplace_addons set description = 'أضف فرع بنفسك فوق فروع باقتك — يجي معه موظفين وموردين' where slug = 'extra_branch';

commit;
