-- إصلاح: صرفتين بنفس اللحظة لنفس المنتج كانت وحدة منهم تضيع من الرصيد.
-- السبب: الـ trigger يحسب مجموع الحركات بدون قفل صف المنتج، فكل عملية تحسب بدون حركة الثانية.
-- الإصلاح: نقفل صف المنتج أول (FOR NO KEY UPDATE)، وبعدها نحسب المجموع بجملة جديدة تشوف كل الحركات المؤكدة.
-- NO KEY UPDATE (مو FOR UPDATE): ما يتعارض مع قفل المفتاح الأجنبي اللي تاخذه إضافة الحركة نفسها —
-- FOR UPDATE كان يسبب deadlock بين صرفتين متزامنتين (انجرّب على staging).
-- ما يغيّر أي بيانات موجودة — نفس المعادلة (qty = مجموع الحركات) بس صارت آمنة مع التزامن.
create or replace function public.sync_product_qty()
returns trigger
language plpgsql
as $function$
begin
  perform 1 from products where id = new.product_id for no key update;
  update products
  set qty = (
    select coalesce(sum(qty_change), 0)
    from stock_movements
    where product_id = new.product_id
  )
  where id = new.product_id;
  return new;
end;
$function$;
