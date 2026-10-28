-- يرجّع الـ trigger لنسخته السابقة (بدون قفل)
create or replace function public.sync_product_qty()
returns trigger
language plpgsql
as $function$
begin
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
