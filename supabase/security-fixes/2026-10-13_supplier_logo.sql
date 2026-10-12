-- شعار المورد (يرفعه من بوابته ويظهر للعملاء في قائمة الموردين)
alter table public.supplier_profiles add column if not exists logo_url text;
