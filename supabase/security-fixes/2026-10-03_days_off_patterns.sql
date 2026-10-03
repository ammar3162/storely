-- أنماط الإجازة: أسبوعي ثابت، أسبوع وأسبوع (biweekly + أسبوع البداية)، تواريخ يحددها المالك، أو رصيد شهري مرن
alter table public.staff_members add column if not exists biweekly_anchor date;
alter table public.staff_members add column if not exists off_dates date[] not null default '{}';
alter table public.staff_members drop constraint if exists staff_members_days_off_mode_chk;
alter table public.staff_members add constraint staff_members_days_off_mode_chk check (days_off_mode in ('weekly','biweekly','dates','monthly'));
alter table public.staff_members drop constraint if exists staff_members_off_dates_len_chk;
alter table public.staff_members add constraint staff_members_off_dates_len_chk check (cardinality(off_dates) <= 400);
notify pgrst, 'reload schema';
