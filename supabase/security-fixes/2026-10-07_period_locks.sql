-- إقفال الشهر: المحاسب يقفل شهر خلص، وبعدها ما ينقدر أحد يضيف/يعدّل/يحذف مشتريات أو إقفالات كاشير بتاريخ داخله
-- المنع بقاعدة البيانات نفسها (Trigger) — حتى لو فيه طريق بالكود نسيناه
create table if not exists public.period_locks (
  org_id uuid not null references public.organizations(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  locked_by uuid references public.accountant_users(id) on delete set null,
  locked_by_name text,
  locked_at timestamptz not null default now(),
  primary key (org_id, month)
);
create table if not exists public.period_lock_log (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  month date not null,
  action text not null check (action in ('lock','unlock','request_unlock')),
  by_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_period_lock_log_org on public.period_lock_log (org_id, created_at desc);
alter table public.period_locks enable row level security;
alter table public.period_lock_log enable row level security;
revoke all on public.period_locks, public.period_lock_log from anon, authenticated;

create or replace function public.period_locked(p_org uuid, p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.period_locks where org_id = p_org and month = date_trunc('month', p_day)::date)
$$;

-- المشتريات: نسمح بتسجيل الدفع لاحقاً (payment_status/paid_at/due_date) — غيره ممنوع بالشهر المقفل
create or replace function public.purchases_period_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare d_old date; d_new date;
begin
  if tg_op in ('UPDATE','DELETE') then d_old := (old.created_at at time zone 'Asia/Riyadh')::date; end if;
  if tg_op in ('INSERT','UPDATE') then d_new := (new.created_at at time zone 'Asia/Riyadh')::date; end if;
  if tg_op = 'UPDATE' and (to_jsonb(new) - array['payment_status','paid_at','due_date','vat_amount','total_amount'])
                         = (to_jsonb(old) - array['payment_status','paid_at','due_date','vat_amount','total_amount']) then
    return new;
  end if;
  if (d_old is not null and public.period_locked(old.org_id, d_old)) then
    raise exception 'PERIOD_LOCKED:%', to_char(d_old, 'YYYY-MM') using errcode = 'P0001';
  end if;
  if (d_new is not null and public.period_locked(new.org_id, d_new)) then
    raise exception 'PERIOD_LOCKED:%', to_char(d_new, 'YYYY-MM') using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_purchases_period_guard on public.purchases;
create trigger trg_purchases_period_guard before insert or update or delete on public.purchases
  for each row execute function public.purchases_period_guard();

-- إقفالات الكاشير: نسمح بقرار المالك على العجز — غيره ممنوع
create or replace function public.closings_period_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - array['deficit_decision','deficit_decided_at'])
                         = (to_jsonb(old) - array['deficit_decision','deficit_decided_at']) then
    return new;
  end if;
  if tg_op in ('UPDATE','DELETE') and public.period_locked(old.org_id, old.closing_date) then
    raise exception 'PERIOD_LOCKED:%', to_char(old.closing_date, 'YYYY-MM') using errcode = 'P0001';
  end if;
  if tg_op in ('INSERT','UPDATE') and public.period_locked(new.org_id, new.closing_date) then
    raise exception 'PERIOD_LOCKED:%', to_char(new.closing_date, 'YYYY-MM') using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_closings_period_guard on public.cashier_closings;
create trigger trg_closings_period_guard before insert or update or delete on public.cashier_closings
  for each row execute function public.closings_period_guard();

revoke all on function public.period_locked(uuid, date) from anon, authenticated;
notify pgrst, 'reload schema';
