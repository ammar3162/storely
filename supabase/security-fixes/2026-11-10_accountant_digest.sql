-- الملخص الأسبوعي للمحاسب: آخر أسبوع انرسل (يمنع التكرار لو انعادت المهمة أو اشتغلت من مشروعين) + إيقاف بطلب المحاسب
alter table public.accountant_users add column if not exists digest_week date;
alter table public.accountant_users add column if not exists digest_opt_out boolean not null default false;
