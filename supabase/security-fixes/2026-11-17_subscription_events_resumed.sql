-- سجل أحداث الاشتراك: نضيف «resumed» (استئناف حساب موقوف) — الإيقاف يسجّل cancelled، فالاستئناف لازم يقابله
-- عشان إحصائيات الإلغاء (Churn) ما تحسب الحساب المستأنف ملغى. توسيع قائمة مسموحة فقط — ما يغيّر أي بيانات.
alter table public.subscription_events drop constraint if exists subscription_events_event_type_check;
alter table public.subscription_events add constraint subscription_events_event_type_check
  check (event_type = any (array['trial_started','activated','cancelled','upgraded','downgraded','renewed','resumed']::text[]));
