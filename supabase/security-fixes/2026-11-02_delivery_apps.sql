-- تطبيقات التوصيل في إقفال الكاشير (هنقرستيشن، جاهز، كيتا...)
-- organizations.delivery_apps: قائمة أسماء التطبيقات اللي يختارها المالك (فاضية افتراضياً)
-- cashier_closings.delivery: مبلغ كل تطبيق بالإقفال [{name, amount}]، و delivery_amount مجموعها
-- الكاش المتوقع = المبيعات − الشبكة − التوصيل. أعمدة جديدة بقيم صفرية: ما تغيّر أي إقفال قديم ولا معناه
alter table public.organizations
  add column if not exists delivery_apps jsonb not null default '[]'::jsonb;

alter table public.cashier_closings
  add column if not exists delivery jsonb not null default '[]'::jsonb,
  add column if not exists delivery_amount numeric not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_delivery_apps_check') then
    alter table public.organizations add constraint organizations_delivery_apps_check
      check (jsonb_typeof(delivery_apps) = 'array' and jsonb_array_length(delivery_apps) <= 12);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cashier_closings_delivery_check') then
    alter table public.cashier_closings add constraint cashier_closings_delivery_check
      check (jsonb_typeof(delivery) = 'array' and delivery_amount >= 0);
  end if;
end $$;
