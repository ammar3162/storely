-- إشعارات الجوال حسب المستخدم والفرع (نفس قاعدة الجرس branch_ok):
-- المالك يوصله كل شي، ومدير الفرع يوصله إشعارات فرعه والإشعارات العامة فقط، والمدير المحذوف تنحذف أجهزته.
-- أعمدة جديدة فقط (فاضية للاشتراكات القديمة = تعامل كجهاز مالك لين يعيد الاشتراك) — ما يحذف ولا يعدّل بيانات.
alter table public.push_subscriptions add column if not exists profile_id uuid references public.profiles(id) on delete cascade;
alter table public.push_subscriptions add column if not exists branch_id uuid references public.branches(id) on delete cascade;
create index if not exists push_subscriptions_org_idx on public.push_subscriptions(org_id);
