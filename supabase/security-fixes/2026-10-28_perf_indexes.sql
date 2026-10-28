-- أداء: فهارس للاستعلامات المتكررة بالمنشأة/الفرع + إشارة التحديث الفوري لطلبات واشتراكات الإضافات.
-- ما تغيّر أي بيانات. الجداول صغيرة الحين، فإنشاء الفهرس لحظي.
create index if not exists idx_products_org_branch      on public.products (org_id, branch_id) where is_active;
create index if not exists idx_staff_members_org_branch on public.staff_members (org_id, branch_id);
create index if not exists idx_staff_tasks_org_staff    on public.staff_tasks (org_id, staff_id, created_at desc);
create index if not exists idx_staff_notif_staff        on public.staff_notifications (staff_id, created_at desc);
create index if not exists idx_suppliers_org            on public.suppliers (org_id, branch_id);
create index if not exists idx_branches_org             on public.branches (org_id, is_active);
create index if not exists idx_supplier_orders_product  on public.supplier_orders (product_id, created_at desc);
create index if not exists idx_push_subs_org            on public.push_subscriptions (org_id);

-- فهارس مكررة (نفس الأعمدة يغطيها فهرس ثاني)
drop index if exists public.idx_products_org_id;          -- يغطيه idx_products_org (org_id, is_active)
drop index if exists public.idx_cashier_closings_org;     -- يغطيه idx_cashier_closings_org_date

-- التحديث الفوري: صفحة الإضافات تتحدث لما الأدمن يوافق/يرفض أو يتغير الاشتراك
do $$
declare t text;
begin
  foreach t in array array['addon_requests','org_addon_subscriptions'] loop
    execute format('drop trigger if exists trg_org_live_ping on public.%I', t);
    execute format('create trigger trg_org_live_ping after insert or update or delete on public.%I for each row execute function public.org_live_ping()', t);
  end loop;
end $$;
