-- رجوع عن 2026-11-01_org_discount.sql (يمسح الخصومات المسجّلة)
alter table public.organizations drop constraint if exists organizations_discount_check;
alter table public.organizations
  drop column if exists discount_until,
  drop column if exists discount_note,
  drop column if exists discount_value,
  drop column if exists discount_type;
