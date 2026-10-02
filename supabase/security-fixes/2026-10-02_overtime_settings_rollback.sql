alter table public.organizations
  drop column if exists overtime_mode, drop column if exists overtime_multiplier,
  drop column if exists overtime_fixed_rate, drop column if exists overtime_min_minutes;
notify pgrst, 'reload schema';
