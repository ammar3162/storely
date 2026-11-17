-- الفواتير المرتجعة في إقفال الكاشير (طلب المالك 2026-11-17)
-- cashier_closings.returns: [{invoice_no, photo, reason, dup_of}] — صورة الفاتورة المرتجعة ورقمها وسبب اختياري
--   photo = رابط الصورة في مجلد invoices الخاص (نفس صور الإقفال)، وdup_of = تاريخ إقفال سابق فيه نفس الرقم
-- للتوثيق فقط: ما تدخل في حساب الكاش المتوقع ولا الفرق. عمود جديد بقيمة فاضية: ما يغيّر أي إقفال قديم ولا معناه
alter table public.cashier_closings
  add column if not exists returns jsonb not null default '[]'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashier_closings_returns_check') then
    alter table public.cashier_closings add constraint cashier_closings_returns_check
      check (jsonb_typeof(returns) = 'array' and jsonb_array_length(returns) <= 20);
  end if;
end $$;
