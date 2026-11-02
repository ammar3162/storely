-- رجوع عن 2026-11-03_accountant_edits.sql (يمسح سجل تعديلات المشتريات وعلامات المصدر — القيم المعدّلة نفسها تبقى)
drop table if exists public.purchase_edits;
alter table public.purchases drop constraint if exists purchases_edited_source_check;
alter table public.purchases drop column if exists edited_source, drop column if exists edited_by, drop column if exists edited_at;
alter table public.cashier_closing_edits drop constraint if exists cashier_closing_edits_source_check;
alter table public.cashier_closing_edits drop column if exists reverted_by, drop column if exists reverted_at, drop column if exists accountant_id, drop column if exists source;
alter table public.cashier_closings drop constraint if exists cashier_closings_edited_source_check;
alter table public.cashier_closings drop column if exists edited_source;
notify pgrst, 'reload schema';
