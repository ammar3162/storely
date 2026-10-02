alter table public.cashier_closings drop constraint if exists cashier_closings_deficit_reason_len;
alter table public.cashier_closings drop column if exists deficit_reason;
notify pgrst, 'reload schema';
