alter table public.organizations drop column if exists staff_salary_visible;
notify pgrst, 'reload schema';
