-- 2026-10-24 تذكير التجديد كل يومين للي انتهى اشتراكهم (بدل إشعار مرة وحدة)
begin;
alter table public.profiles add column if not exists renewal_reminder_at timestamptz;
commit;
