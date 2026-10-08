drop index if exists public.idx_purchases_tax_invoice;
alter table public.purchases drop constraint if exists purchases_supplier_vat_chk;
alter table public.purchases drop constraint if exists purchases_invoice_number_len_chk;
alter table public.purchases drop column if exists invoice_group;
alter table public.purchases drop column if exists supplier_vat_number;
alter table public.purchases drop column if exists invoice_number;
alter table public.suppliers drop constraint if exists suppliers_vat_chk;
alter table public.suppliers drop column if exists vat_number;
notify pgrst, 'reload schema';
