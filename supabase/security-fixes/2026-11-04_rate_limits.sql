-- حد عدد الطلبات (rate limiting) لكل مفتاح: رقم جوال / إيميل / IP / منشأة.
-- عدّاد بنافذة ثابتة في القاعدة عشان يشتغل صح مهما كان عدد نسخ الخادم.
-- rate_limit_hit يزيد العدّاد ويرجّع 0 لو الطلب مسموح، أو عدد الثواني المتبقية لين تنفتح النافذة.

create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer     not null default 0
);
alter table public.rate_limits enable row level security;  -- بدون سياسات: المتصفح ما يقدر يقرأ أو يكتب
revoke all on table public.rate_limits from anon, authenticated, public;
grant all on table public.rate_limits to service_role;

create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns integer
language plpgsql
as $$
declare r public.rate_limits;
begin
  insert into public.rate_limits as l (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits         = case when l.window_start < now() - make_interval(secs => p_window_seconds) then 1 else l.hits + 1 end,
    window_start = case when l.window_start < now() - make_interval(secs => p_window_seconds) then now() else l.window_start end
  returning * into r;

  -- تنظيف خفيف للعدّادات القديمة (مرة كل ~200 طلب)
  if random() < 0.005 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  if r.hits > p_max then
    return greatest(1, ceil(extract(epoch from (r.window_start + make_interval(secs => p_window_seconds) - now())))::int);
  end if;
  return 0;
end $$;

revoke all on function public.rate_limit_hit(text, integer, integer) from anon, authenticated, public;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
notify pgrst, 'reload schema';
