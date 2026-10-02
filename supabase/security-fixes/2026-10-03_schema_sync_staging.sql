-- مزامنة عكسية: أعمدة موجودة بالإنتاج (انضافت يدوياً) ويستخدمها الكود، وناقصة بـ staging
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.whatsapp_sessions add column if not exists paused_until timestamptz;
notify pgrst, 'reload schema';
