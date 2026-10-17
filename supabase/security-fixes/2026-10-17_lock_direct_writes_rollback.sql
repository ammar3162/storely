-- تراجع 2026-10-17_lock_direct_writes: يرجّع السياسات والصلاحيات كما كانت بالضبط
begin;

drop policy if exists "Users can manage their own seen features_read" on public."user_seen_features";
drop policy if exists "org_branch_access_read" on public."suppliers";
drop policy if exists "supplier_own_reps_read" on public."supplier_reps";
drop policy if exists "supplier_own_profile_insert" on public."supplier_profiles";
drop policy if exists "supplier_own_profile_read" on public."supplier_profiles";
drop policy if exists "org_branch_access_read" on public."supplier_orders";
drop policy if exists "supplier_own_catalog_read" on public."supplier_catalog_items";
drop policy if exists "org_branch_access_read" on public."stock_movements";
drop policy if exists "org members can manage recipes_read" on public."recipes";
drop policy if exists "org members can manage recipe items_read" on public."recipe_items";
drop policy if exists "supplier_own_quote_requests_read" on public."quote_requests";
drop policy if exists "org_own_quote_requests_read" on public."quote_requests";
drop policy if exists "org_branch_access_read" on public."purchases";
drop policy if exists "org_branch_access_read" on public."products";
drop policy if exists "org_branch_access_via_product_read" on public."product_suppliers";
drop policy if exists "org_branch_access_read" on public."notifications";
drop policy if exists "supplier_own_chat_messages_read" on public."chat_messages";
drop policy if exists "org_own_chat_messages_read" on public."chat_messages";
drop policy if exists "org_branch_access_read" on public."cashier_closings";
drop policy if exists "users can manage their org branches_read" on public."branches";
create policy "users can manage their org branches" on public."branches" as permissive for all to public
  using ((org_id IN ( SELECT profiles.org_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))))
  with check ((org_id IN ( SELECT profiles.org_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
create policy "org_branch_access" on public."cashier_closings" as permissive for all to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)))
  with check (((org_id = my_org_id()) AND branch_ok(branch_id)));
create policy "org_own_chat_messages" on public."chat_messages" as permissive for all to public
  using ((org_id = my_org_id()))
  with check ((org_id = my_org_id()));
create policy "supplier_own_chat_messages" on public."chat_messages" as permissive for all to public
  using ((supplier_id = auth.uid()))
  with check ((supplier_id = auth.uid()));
create policy "org_branch_access" on public."notifications" as permissive for all to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)))
  with check (((org_id = my_org_id()) AND branch_ok(branch_id)));
create policy "supplier_write_org_reviews" on public."org_reviews" as permissive for insert to public
  with check ((supplier_id = auth.uid()));
create policy "organizations_own_update" on public."organizations" as permissive for update to public
  using ((id = ( SELECT profiles.org_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
create policy "org_branch_access_via_product" on public."product_suppliers" as permissive for all to public
  using ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_suppliers.product_id) AND (p.org_id = my_org_id()) AND branch_ok(p.branch_id)))))
  with check ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_suppliers.product_id) AND (p.org_id = my_org_id()) AND branch_ok(p.branch_id)))));
create policy "org_branch_access" on public."products" as permissive for all to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)))
  with check (((org_id = my_org_id()) AND branch_ok(branch_id)));
create policy "insert_own_profile" on public."profiles" as permissive for insert to authenticated
  with check ((id = auth.uid()));
create policy "profiles_insert" on public."profiles" as permissive for insert to public
  with check ((id = auth.uid()));
create policy "profiles_update" on public."profiles" as permissive for update to public
  using ((id = auth.uid()));
create policy "update_own_profile" on public."profiles" as permissive for update to authenticated
  using ((id = auth.uid()));
create policy "org_branch_access" on public."purchases" as permissive for all to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)))
  with check (((org_id = my_org_id()) AND branch_ok(branch_id)));
create policy "org_own_quote_requests" on public."quote_requests" as permissive for all to public
  using ((org_id = my_org_id()))
  with check ((org_id = my_org_id()));
create policy "supplier_own_quote_requests" on public."quote_requests" as permissive for all to public
  using ((supplier_id = auth.uid()))
  with check ((supplier_id = auth.uid()));
create policy "org members can manage recipe items" on public."recipe_items" as permissive for all to public
  using ((EXISTS ( SELECT 1
   FROM (recipes r
     JOIN profiles pr ON ((pr.org_id = r.org_id)))
  WHERE ((r.id = recipe_items.recipe_id) AND (pr.id = auth.uid())))));
create policy "org members can insert recipe sales log" on public."recipe_sales_log" as permissive for insert to public
  with check ((EXISTS ( SELECT 1
   FROM profiles pr
  WHERE ((pr.org_id = recipe_sales_log.org_id) AND (pr.id = auth.uid())))));
create policy "org members can manage recipes" on public."recipes" as permissive for all to public
  using ((EXISTS ( SELECT 1
   FROM profiles pr
  WHERE ((pr.org_id = recipes.org_id) AND (pr.id = auth.uid())))));
create policy "org_branch_access" on public."staff_members" as permissive for all to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)))
  with check (((org_id = my_org_id()) AND branch_ok(branch_id)));
create policy "movements_insert_own_org" on public."stock_movements" as permissive for insert to public
  with check ((product_id IN ( SELECT products.id
   FROM products
  WHERE (products.org_id = ( SELECT profiles.org_id
           FROM profiles
          WHERE (profiles.id = auth.uid()))))));
create policy "org_branch_access" on public."stock_movements" as permissive for all to public
  using ((product_id IN ( SELECT products.id
   FROM products
  WHERE ((products.org_id = my_org_id()) AND branch_ok(products.branch_id)))))
  with check ((product_id IN ( SELECT products.id
   FROM products
  WHERE ((products.org_id = my_org_id()) AND branch_ok(products.branch_id)))));
create policy "supplier_own_catalog" on public."supplier_catalog_items" as permissive for all to public
  using ((supplier_id = auth.uid()))
  with check ((supplier_id = auth.uid()));
create policy "org_branch_access" on public."supplier_orders" as permissive for all to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)))
  with check (((org_id = my_org_id()) AND branch_ok(branch_id)));
create policy "supplier_own_profile" on public."supplier_profiles" as permissive for all to public
  using ((id = auth.uid()))
  with check ((id = auth.uid()));
create policy "supplier_own_reps" on public."supplier_reps" as permissive for all to public
  using ((supplier_id = auth.uid()))
  with check ((supplier_id = auth.uid()));
create policy "org_own_reviews_write" on public."supplier_reviews" as permissive for insert to public
  with check ((org_id = my_org_id()));
create policy "org_branch_access" on public."suppliers" as permissive for all to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)))
  with check (((org_id = my_org_id()) AND branch_ok(branch_id)));
create policy "Users can manage their own seen features" on public."user_seen_features" as permissive for all to public
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));
create policy "logs_insert" on public."whatsapp_logs" as permissive for insert to public
  with check ((org_id = my_org_id()));

grant execute on function public.delete_auth_user(uuid) to public, anon, authenticated;
grant execute on function public.delete_auth_identity(uuid) to public, anon, authenticated;

commit;
