alter table public.branches drop column if exists location_accuracy_m;
notify pgrst, 'reload schema';
