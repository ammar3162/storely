drop trigger if exists trg_purchases_period_guard on public.purchases;
drop trigger if exists trg_closings_period_guard on public.cashier_closings;
drop function if exists public.purchases_period_guard();
drop function if exists public.closings_period_guard();
drop function if exists public.period_locked(uuid, date);
drop table if exists public.period_lock_log;
drop table if exists public.period_locks;
notify pgrst, 'reload schema';
