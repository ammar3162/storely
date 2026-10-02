-- سبب العجز بإقفال الكاشير — إجباري من الواجهة والـAPI لما يكون فيه عجز
alter table public.cashier_closings add column if not exists deficit_reason text;
alter table public.cashier_closings drop constraint if exists cashier_closings_deficit_reason_len;
alter table public.cashier_closings add constraint cashier_closings_deficit_reason_len check (deficit_reason is null or char_length(deficit_reason) <= 500);
notify pgrst, 'reload schema';
