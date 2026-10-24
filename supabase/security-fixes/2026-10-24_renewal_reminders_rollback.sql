begin;
alter table public.profiles drop column if exists renewal_reminder_at;
commit;
