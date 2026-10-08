-- المالك يحدد ساعة إرسال تقرير المحاسب (بتوقيت السعودية)
alter table public.accountant_links add column if not exists send_hour smallint not null default 8;
alter table public.accountant_links drop constraint if exists accountant_links_send_hour_chk;
alter table public.accountant_links add constraint accountant_links_send_hour_chk check (send_hour between 0 and 23);
notify pgrst, 'reload schema';
