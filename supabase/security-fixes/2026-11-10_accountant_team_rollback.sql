drop table if exists public.accountant_team;
delete from public.accountant_access where delegated_from is not null;
drop index if exists public.accountant_access_delegated_idx;
alter table public.accountant_access drop column if exists delegated_from;
