-- طلب فرع إضافي بخطوة وحدة («باقتك المخصصة»)، طلب المالك 2026-11-17
-- addon_requests.details: {branch_name, location, services[]} — اسم الفرع الجديد والخدمات اللي اختارها له العميل.
-- عند موافقة الأدمن: ينشأ الفرع وتتفعّل له الخدمات مرة وحدة.
-- عمود جديد فاضي (null) للطلبات القديمة وباقي الإضافات: ما يغيّر أي طلب موجود ولا معناه
alter table public.addon_requests
  add column if not exists details jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'addon_requests_details_check') then
    alter table public.addon_requests add constraint addon_requests_details_check
      check (details is null or jsonb_typeof(details) = 'object');
  end if;
end $$;
