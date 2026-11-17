-- يفشل لو فيه صفوف resumed — احذفها أو حوّلها قبل التراجع
alter table public.subscription_events drop constraint if exists subscription_events_event_type_check;
alter table public.subscription_events add constraint subscription_events_event_type_check
  check (event_type = any (array['trial_started','activated','cancelled','upgraded','downgraded','renewed']::text[]));
