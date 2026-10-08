-- فاتورة موثقة من باركود هيئة الزكاة: نحفظ أرقامها الأصلية (الموقّعة من المورد) عشان نطابقها ونكشف التكرار والتلاعب
alter table public.purchases add column if not exists qr_verified boolean not null default false;
alter table public.purchases add column if not exists qr_fingerprint text;            -- الرقم الضريبي|وقت الإصدار|الإجمالي
alter table public.purchases add column if not exists qr_total numeric(12,2);
alter table public.purchases add column if not exists qr_vat numeric(12,2);
alter table public.purchases add column if not exists qr_issued_at timestamptz;
alter table public.purchases add column if not exists qr_mismatch boolean not null default false;   -- المسجّل أكبر من الفاتورة الأصلية
create index if not exists idx_purchases_qr_fingerprint on public.purchases (org_id, qr_fingerprint) where qr_fingerprint is not null;
notify pgrst, 'reload schema';
