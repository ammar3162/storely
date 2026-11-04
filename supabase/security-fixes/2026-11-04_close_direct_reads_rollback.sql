-- رجوع: يرجّع سياسات القراءة كما كانت بالضبط (منسوخة من الإنتاج 2026-11-04)

drop policy if exists "users can manage their org branches_read" on public.branches;
create policy "users can manage their org branches_read" on public.branches for select to public using ((org_id IN ( SELECT profiles.org_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
drop policy if exists "org_branch_access_read" on public.cashier_closings;
create policy "org_branch_access_read" on public.cashier_closings for select to public using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy if exists "org_read_own_reviews" on public.org_reviews;
create policy "org_read_own_reviews" on public.org_reviews for select to public using ((org_id = my_org_id()));
drop policy if exists "organizations_own_only" on public.organizations;
create policy "organizations_own_only" on public.organizations for select to public using ((id = ( SELECT profiles.org_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
drop policy if exists "org_branch_access_via_product_read" on public.product_suppliers;
create policy "org_branch_access_via_product_read" on public.product_suppliers for select to public using ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_suppliers.product_id) AND (p.org_id = my_org_id()) AND branch_ok(p.branch_id)))));
drop policy if exists "org_branch_access_read" on public.products;
create policy "org_branch_access_read" on public.products for select to public using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to public using (((id = auth.uid()) OR (org_id = my_org_id())));
drop policy if exists "org_branch_access_read" on public.purchases;
create policy "org_branch_access_read" on public.purchases for select to public using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy if exists "org members can manage recipe items_read" on public.recipe_items;
create policy "org members can manage recipe items_read" on public.recipe_items for select to public using ((EXISTS ( SELECT 1
   FROM (recipes r
     JOIN profiles pr ON ((pr.org_id = r.org_id)))
  WHERE ((r.id = recipe_items.recipe_id) AND (pr.id = auth.uid())))));
drop policy if exists "org members can view recipe items" on public.recipe_items;
create policy "org members can view recipe items" on public.recipe_items for select to public using ((EXISTS ( SELECT 1
   FROM (recipes r
     JOIN profiles pr ON ((pr.org_id = r.org_id)))
  WHERE ((r.id = recipe_items.recipe_id) AND (pr.id = auth.uid())))));
drop policy if exists "org members can manage recipes_read" on public.recipes;
create policy "org members can manage recipes_read" on public.recipes for select to public using ((EXISTS ( SELECT 1
   FROM profiles pr
  WHERE ((pr.org_id = recipes.org_id) AND (pr.id = auth.uid())))));
drop policy if exists "org members can view recipes" on public.recipes;
create policy "org members can view recipes" on public.recipes for select to public using ((EXISTS ( SELECT 1
   FROM profiles pr
  WHERE ((pr.org_id = recipes.org_id) AND (pr.id = auth.uid())))));
drop policy if exists "org_branch_access_read" on public.stock_movements;
create policy "org_branch_access_read" on public.stock_movements for select to public using ((product_id IN ( SELECT products.id
   FROM products
  WHERE ((products.org_id = my_org_id()) AND branch_ok(products.branch_id)))));
drop policy if exists "org members view own supplier order logs" on public.supplier_order_logs;
create policy "org members view own supplier order logs" on public.supplier_order_logs for select to authenticated using ((product_id IN ( SELECT products.id
   FROM products
  WHERE (products.org_id = my_org_id()))));
drop policy if exists "org_branch_access_read" on public.supplier_orders;
create policy "org_branch_access_read" on public.supplier_orders for select to public using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy if exists "org_branch_access_read" on public.suppliers;
create policy "org_branch_access_read" on public.suppliers for select to public using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy if exists "logs_select" on public.whatsapp_logs;
create policy "logs_select" on public.whatsapp_logs for select to public using ((org_id = my_org_id()));

notify pgrst, 'reload schema';
