drop index if exists public.idx_purchases_qr_fingerprint;
alter table public.purchases drop column if exists qr_mismatch;
alter table public.purchases drop column if exists qr_issued_at;
alter table public.purchases drop column if exists qr_vat;
alter table public.purchases drop column if exists qr_total;
alter table public.purchases drop column if exists qr_fingerprint;
alter table public.purchases drop column if exists qr_verified;
notify pgrst, 'reload schema';
