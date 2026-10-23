-- 2026-10-23 إيقاف طابور واتساب القديم لتنبيهات نقص المخزون
-- دالتين على stock_movements كانت تضيف رسالة "pending" في whatsapp_logs مع كل صرف تحت الحد الأدنى،
-- وما فيه شي يرسلها (تراكمت ~1900 رسالة). التنبيهات الحقيقية تطلع من /api/notify-low-stock كل ساعة.
-- add_low_stock_notification ما فيها حماية: لو فشل الإدخال يفشل الصرف نفسه — سبب إضافي لإزالتها.
-- الرسائل القديمة ما تنحذف: تنعلّم "skipped" (ملغاة) عشان تبقى بالسجل وما تنرسل أبداً.
begin;
drop trigger if exists after_dispense_notify on public.stock_movements;
drop trigger if exists after_dispense_notification on public.stock_movements;
drop function if exists public.notify_low_stock_on_dispense();
drop function if exists public.add_low_stock_notification();

alter table public.whatsapp_logs drop constraint if exists whatsapp_logs_status_check;
alter table public.whatsapp_logs add constraint whatsapp_logs_status_check check (status in ('sent', 'failed', 'pending', 'skipped'));
update public.whatsapp_logs set status = 'skipped' where status = 'pending';
commit;
