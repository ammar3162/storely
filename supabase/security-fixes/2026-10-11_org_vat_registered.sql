-- التسجيل في ضريبة القيمة المضافة صار إعداد واحد للمنشأة (كان محفوظ عند كل محاسب)
-- null = ما حدده المالك بعد → التقارير ترجع لإعداد رابط المحاسب
alter table public.organizations add column if not exists vat_registered boolean;

-- نعبيه من إعدادات المحاسبين الحالية: لو أي محاسب مكتوب عنده «مسجلة» → مسجلة
update public.organizations o set vat_registered = true
where o.vat_registered is null and (
  exists (select 1 from public.accountant_links l where l.org_id = o.id and l.vat_registered)
  or exists (select 1 from public.accountant_access a where a.org_id = o.id and a.vat_registered and a.status <> 'revoked'));
update public.organizations o set vat_registered = false
where o.vat_registered is null and (
  exists (select 1 from public.accountant_links l where l.org_id = o.id)
  or exists (select 1 from public.accountant_access a where a.org_id = o.id and a.status <> 'revoked'));
