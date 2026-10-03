-- ============================================================================
-- إغلاق سياسات RLS المفتوحة — نسخة الإنتاج (storely2) — 2026-09-22
-- ============================================================================
-- مبنية على لقطة سياسات الإنتاج الفعلية (2026-09-23). الفرق عن staging:
-- organizations و cashier_closings بالإنتاج سليمة أصلاً، فما نلمسها.
-- للتراجع: 2026-09-22_production_rollback.sql
-- لا يحذف ولا يعدّل أي بيانات — يغيّر سياسات الصلاحيات فقط.
-- ============================================================================


-- ============================ الجزء 1 ============================
-- آمن بأي وقت — ما فيه كود بالمتصفح يعتمد عليه
begin;

drop policy if exists "service_role_all_fixed_expenses" on public.fixed_expenses;
drop policy if exists "service_role_all_monthly_fixed_expenses" on public.monthly_fixed_expenses;
drop policy if exists "service_role_all_inventory_snapshots" on public.inventory_snapshots;
create policy "service_role_all_fixed_expenses" on public.fixed_expenses to service_role using (true) with check (true);
create policy "service_role_all_monthly_fixed_expenses" on public.monthly_fixed_expenses to service_role using (true) with check (true);
create policy "service_role_all_inventory_snapshots" on public.inventory_snapshots to service_role using (true) with check (true);

drop policy if exists "service role only" on public.whatsapp_sessions;
create policy "service role only" on public.whatsapp_sessions to service_role using (true) with check (true);

drop policy if exists "org_insert" on public.push_subscriptions;

commit;


-- ============================ الجزء 2 ============================
-- ⚠️ بعد نشر الكود على الإنتاج فقط (لوحة الأدمن القديمة تعتمد على هذي السياسات)
begin;

drop policy if exists "service_role_admin_notifs" on public.admin_notifications;

-- المالك/مدير الفرع يضيف إشعارات منشأته عبر "org_branch_access"
drop policy if exists "authenticated_insert_notifications" on public.notifications;

drop policy if exists "anon_select" on public.supplier_applications;
drop policy if exists "anon_insert" on public.supplier_applications;
drop policy if exists "anon_update" on public.supplier_applications;
drop policy if exists "anon_delete" on public.supplier_applications;
drop policy if exists "marketplace_read_approved" on public.supplier_applications;
create policy "marketplace_read_approved" on public.supplier_applications
  for select to authenticated
  using (status = 'approved' and marketplace_consent = true);

commit;
