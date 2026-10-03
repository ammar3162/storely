-- قفل الفروع الزايدة عند تخفيض الباقة (أو انتهاء إضافة "فرع إضافي") وإرجاعها عند الترقية
-- plan_locked_at: متى توقف الفرع/الموظف بسبب الحد (null = نشط أو أوقفه المالك بنفسه)
-- شغّله قبل نشر الكود (التجريبي أولاً ثم الإنتاج).

alter table branches      add column if not exists plan_locked_at timestamptz;
alter table staff_members add column if not exists plan_locked_at timestamptz;

-- تحقق
select table_name, column_name from information_schema.columns
where column_name = 'plan_locked_at' and table_name in ('branches','staff_members');
