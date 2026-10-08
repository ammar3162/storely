alter table public.accountant_links drop constraint if exists accountant_links_send_hour_chk;
alter table public.accountant_links drop column if exists send_hour;
notify pgrst, 'reload schema';
