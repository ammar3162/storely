-- بيانات الفاتورة الضريبية للمحاسب: رقم الفاتورة + الرقم الضريبي للمورد + ربط أصناف الفاتورة الوحدة
alter table public.purchases add column if not exists invoice_number text;
alter table public.purchases add column if not exists supplier_vat_number text;
alter table public.purchases add column if not exists invoice_group uuid;
alter table public.purchases drop constraint if exists purchases_invoice_number_len_chk;
alter table public.purchases add constraint purchases_invoice_number_len_chk check (invoice_number is null or char_length(invoice_number) between 1 and 50);
-- الرقم الضريبي السعودي: ١٥ رقم يبدأ وينتهي بـ 3
alter table public.purchases drop constraint if exists purchases_supplier_vat_chk;
alter table public.purchases add constraint purchases_supplier_vat_chk check (supplier_vat_number is null or supplier_vat_number ~ '^3[0-9]{13}3$');
create index if not exists idx_purchases_tax_invoice on public.purchases (org_id, supplier_vat_number, invoice_number) where supplier_vat_number is not null;

-- الرقم الضريبي محفوظ مع المورد — يتعبى تلقائياً بالفواتير الجاية
alter table public.suppliers add column if not exists vat_number text;
alter table public.suppliers drop constraint if exists suppliers_vat_chk;
alter table public.suppliers add constraint suppliers_vat_chk check (vat_number is null or vat_number ~ '^3[0-9]{13}3$');

notify pgrst, 'reload schema';
