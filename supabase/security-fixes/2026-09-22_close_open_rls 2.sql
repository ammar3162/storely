-- ============================================================================
-- إغلاق سياسات RLS المفتوحة للعامة (anon) — 2026-09-22
-- ============================================================================
-- السبب: سياسات كان المقصود فيها "service_role" لكن انكتبت بدون "TO service_role"
-- (فتنطبق على الكل بما فيهم الزوار بدون تسجيل)، أو انفتحت لـ anon عشان صفحات
-- الأدمن والموظفين اللي تشتغل بدون جلسة Supabase.
-- ملاحظة: service_role يتجاوز RLS أصلاً، فهذي السياسات ما كانت لازمة له أبداً.
--
-- الترتيب مهم:
--   الجزء 1: آمن فوراً — ما فيه أي كود بالمتصفح يعتمد عليه.
--   الجزء 2: شغّله فقط بعد نشر كود هذا الفرع (staging ثم الإنتاج) لنفس البيئة،
--            لأن الكود القديم (صفحات الموظفين/الأدمن) يعتمد عليه.
-- كل جزء داخل transaction — لو فشل أي سطر، ما يتغير شي.
-- ============================================================================


-- ============================ الجزء 1 ============================
begin;

-- جداول مصاريف ولقطات مخزون: مفتوحة بالكامل (قراءة/تعديل/حذف) لأي زائر
drop policy if exists "service_role_all_fixed_expenses" on public.fixed_expenses;
drop policy if exists "service_role_all_monthly_fixed_expenses" on public.monthly_fixed_expenses;
drop policy if exists "service_role_all_inventory_snapshots" on public.inventory_snapshots;
create policy "service_role_all_fixed_expenses" on public.fixed_expenses to service_role using (true) with check (true);
create policy "service_role_all_monthly_fixed_expenses" on public.monthly_fixed_expenses to service_role using (true) with check (true);
create policy "service_role_all_inventory_snapshots" on public.inventory_snapshots to service_role using (true) with check (true);

-- جلسات واتساب: مفتوحة بالكامل لأي زائر
drop policy if exists "service role only" on public.whatsapp_sessions;
create policy "service role only" on public.whatsapp_sessions to service_role using (true) with check (true);

-- أي زائر يقدر يضيف منشأة (التسجيل يمر عبر /api/register-org بصلاحية الخادم)
drop policy if exists "org_insert_any" on public.organizations;

-- أي زائر يقدر يضيف اشتراك إشعارات (يمر عبر /api/push-subscribe بصلاحية الخادم)
drop policy if exists "org_insert" on public.push_subscriptions;

-- cashier_closings: بالإنتاج ممكن تكون لسا مفتوحة (بـ staging انصلحت سابقاً) — نوحّدها
drop policy if exists "service_role_all_cashier_closings" on public.cashier_closings;
create policy "service_role_all_cashier_closings" on public.cashier_closings to service_role using (true) with check (true);
drop policy if exists "org_branch_access" on public.cashier_closings;
create policy "org_branch_access" on public.cashier_closings
  using ((org_id = my_org_id()) and branch_ok(branch_id))
  with check ((org_id = my_org_id()) and branch_ok(branch_id));

commit;


-- ============================ الجزء 2 ============================
-- ⚠️ بعد نشر الكود فقط (صفحات الموظفين + المراقبة + إشعارات الأدمن + طلبات الموردين)
begin;

-- أي زائر يقرأ بيانات كل المنشآت (أسماء، أرقام واتساب، الباقات، تواريخ الاشتراك...)
-- المالك يقرأ منشأته عبر "organizations_own_only"، والباقي يمر عبر الـ API
drop policy if exists "service_role_orgs_read" on public.organizations;

-- إشعارات الأدمن: مفتوحة بالكامل لأي زائر
drop policy if exists "service_role_admin_notifs" on public.admin_notifications;

-- أي زائر يضيف إشعار لأي منشأة — المالك يضيف لمنشأته عبر "notifications_org_only"
drop policy if exists "authenticated_insert_notifications" on public.notifications;

-- طلبات الموردين: أي زائر يقرأ/يعدّل/يحذف كل الطلبات (أسماء، جوالات، إيميلات)
-- التقديم يمر عبر /api/supplier-apply والأدمن عبر /api/admin/supplier-applications
drop policy if exists "anon_select" on public.supplier_applications;
drop policy if exists "anon_insert" on public.supplier_applications;
drop policy if exists "anon_update" on public.supplier_applications;
drop policy if exists "anon_delete" on public.supplier_applications;
-- سوق الموردين (/marketplace) يعرض للمسجلين الموردين المعتمدين اللي وافقوا على الظهور فقط
drop policy if exists "marketplace_read_approved" on public.supplier_applications;
create policy "marketplace_read_approved" on public.supplier_applications
  for select to authenticated
  using (status = 'approved' and marketplace_consent = true);

commit;


-- ============================ التحقق ============================
-- المفروض ما يطلع إلا feature_announcements و supplier_reviews (محتوى عام مقصود):
-- select tablename, policyname, cmd, roles from pg_policies
-- where schemaname='public' and (qual='true' or with_check='true') and roles <> '{service_role}';
