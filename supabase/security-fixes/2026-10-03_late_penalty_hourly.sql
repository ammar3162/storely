-- غرامة التأخير: وقت سماح + مبلغ لكل ساعة تأخير (بدل شرائح late_penalty_rules)
alter table public.organizations add column if not exists late_grace_minutes smallint not null default 0;
alter table public.organizations add column if not exists late_penalty_per_hour numeric(10,2);
alter table public.organizations drop constraint if exists organizations_late_grace_range;
alter table public.organizations add constraint organizations_late_grace_range check (late_grace_minutes between 0 and 120);
alter table public.organizations drop constraint if exists organizations_late_penalty_per_hour_range;
alter table public.organizations add constraint organizations_late_penalty_per_hour_range check (late_penalty_per_hour is null or (late_penalty_per_hour >= 0 and late_penalty_per_hour <= 10000));
notify pgrst, 'reload schema';
