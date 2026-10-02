-- صفحة «راتبي» للموظف: المالك يفعّلها من إدارة الموظفين (مقفولة افتراضياً)
alter table public.organizations add column if not exists staff_salary_visible boolean not null default false;
notify pgrst, 'reload schema';
