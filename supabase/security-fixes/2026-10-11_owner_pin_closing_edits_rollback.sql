drop table if exists public.cashier_closing_edits;
alter table public.cashier_closings drop column if exists edit_count;
alter table public.cashier_closings drop column if exists edited_by;
alter table public.cashier_closings drop column if exists edited_at;
alter table public.organizations drop column if exists owner_pin_locked_until;
alter table public.organizations drop column if exists owner_pin_failed;
alter table public.organizations drop column if exists owner_pin_hash;
notify pgrst, 'reload schema';
