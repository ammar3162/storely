-- ============================================================================
-- التراجع عن 2026-09-22_production_apply.sql — يرجّع السياسات حرفياً
-- كما كانت بلقطة الإنتاج (storely2) بتاريخ 2026-09-23
-- ============================================================================
-- ⚠️ هذا يعيد فتح الثغرات. استخدمه فقط لو رجّعت الكود لنسخة قديمة وتعطّلت
-- صفحات الأدمن/الموظفين. ترجيع الجزء 2 لحاله يكفي لإرجاع لوحة الأدمن القديمة.
-- ============================================================================


-- ============================ ترجيع الجزء 2 ============================
begin;

drop policy if exists "marketplace_read_approved" on public.supplier_applications;
drop policy if exists "anon_select" on public.supplier_applications;
drop policy if exists "anon_insert" on public.supplier_applications;
drop policy if exists "anon_update" on public.supplier_applications;
drop policy if exists "anon_delete" on public.supplier_applications;
create policy "anon_select" on public.supplier_applications for select to anon, authenticated using (true);
create policy "anon_insert" on public.supplier_applications for insert to anon, authenticated with check (true);
create policy "anon_update" on public.supplier_applications for update to anon, authenticated using (true) with check (true);
create policy "anon_delete" on public.supplier_applications for delete to anon, authenticated using (true);

drop policy if exists "authenticated_insert_notifications" on public.notifications;
create policy "authenticated_insert_notifications" on public.notifications for insert to anon, authenticated with check (true);

drop policy if exists "service_role_admin_notifs" on public.admin_notifications;
create policy "service_role_admin_notifs" on public.admin_notifications to anon, authenticated using (true) with check (true);

commit;


-- ============================ ترجيع الجزء 1 ============================
begin;

drop policy if exists "org_insert" on public.push_subscriptions;
create policy "org_insert" on public.push_subscriptions for insert to anon, authenticated with check (true);

drop policy if exists "service role only" on public.whatsapp_sessions;
create policy "service role only" on public.whatsapp_sessions using (true) with check (true);

drop policy if exists "service_role_all_fixed_expenses" on public.fixed_expenses;
drop policy if exists "service_role_all_monthly_fixed_expenses" on public.monthly_fixed_expenses;
drop policy if exists "service_role_all_inventory_snapshots" on public.inventory_snapshots;
create policy "service_role_all_fixed_expenses" on public.fixed_expenses using (true) with check (true);
create policy "service_role_all_monthly_fixed_expenses" on public.monthly_fixed_expenses using (true) with check (true);
create policy "service_role_all_inventory_snapshots" on public.inventory_snapshots using (true) with check (true);

commit;
