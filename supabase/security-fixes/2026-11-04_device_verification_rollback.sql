-- رجوع التحقق من الجهاز: يحذف الجدولين والعمود (الأجهزة الموثوقة والرموز تنمسح)
alter table public.platform_settings drop column if exists device_verification;
drop table if exists public.login_codes;
drop table if exists public.trusted_devices;

notify pgrst, 'reload schema';
