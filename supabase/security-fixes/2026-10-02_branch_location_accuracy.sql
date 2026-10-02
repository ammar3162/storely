-- دقة موقع الفرع وقت تحديده (بالمتر): الجوال ~10، اللابتوب ~100
-- تسجيل الحضور يوسّع النطاق بقدرها، عشان الموقع ينفع يتحدد من أي جهاز
alter table public.branches add column if not exists location_accuracy_m numeric;
notify pgrst, 'reload schema';
