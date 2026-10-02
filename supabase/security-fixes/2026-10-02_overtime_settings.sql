-- إعدادات الأوفر تايم لكل منشأة (صفحة الحضور والانصراف):
--   overtime_mode: auto = (الراتب الأساسي ÷ 30 ÷ ساعات الشفت) × المضاعف | fixed = مبلغ ثابت للساعة | off = بدون
alter table public.organizations
  add column if not exists overtime_mode        text    not null default 'auto' check (overtime_mode in ('auto', 'fixed', 'off')),
  add column if not exists overtime_multiplier  numeric not null default 1.5 check (overtime_multiplier between 1 and 3),
  add column if not exists overtime_fixed_rate  numeric check (overtime_fixed_rate is null or overtime_fixed_rate between 0 and 10000),
  add column if not exists overtime_min_minutes int     not null default 15 check (overtime_min_minutes between 0 and 240);
notify pgrst, 'reload schema';
