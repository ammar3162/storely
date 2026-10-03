-- الخصم التلقائي لغرامات التأخير يبدأ من وقت تفعيل الميزة — الغرامات المعلّقة قبلها ما تنخصم
alter table public.organizations add column if not exists late_auto_from timestamptz not null default now();
notify pgrst, 'reload schema';
