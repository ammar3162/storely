-- خصم خاص لكل منشأة (من لوحة الإدارة) — يطلع سطر بفاتورتها
-- أعمدة جديدة فاضية افتراضياً: ما تغيّر أي بيانات موجودة ولا أي فاتورة
alter table public.organizations
  add column if not exists discount_type text,
  add column if not exists discount_value numeric,
  add column if not exists discount_note text,
  add column if not exists discount_until date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_discount_check') then
    alter table public.organizations add constraint organizations_discount_check check (
      (discount_type is null and discount_value is null)
      or (discount_type = 'percent' and discount_value > 0 and discount_value <= 100)
      or (discount_type = 'amount' and discount_value > 0)
    );
  end if;
end $$;
