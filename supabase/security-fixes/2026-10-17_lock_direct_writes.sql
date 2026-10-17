-- 2026-10-17 قفل الكتابة المباشرة من المتصفح
-- المشكلة: سياسات RLS كانت تسمح لأي مستخدم مسجّل يكتب مباشرة بالمفتاح العام (بدون المرور على /api):
--   • profiles: يغيّر org_id و role لنفسه → يصير مالك، أو ينضم لمنشأة ثانية
--   • organizations: يرقّي الباقة ويمدد الاشتراك بدون دفع
--   • باقي الجداول: يتجاوز فحوصات الخادم (صلاحيات المدير، الإقفال الشهري، صورة الفاتورة الضريبية…)
--   • delete_auth_user / delete_auth_identity: أي زائر (حتى بدون دخول) يحذف أي حساب برقمه
-- الحل: الكتابة كلها من الخادم (service_role)؛ المتصفح يقرأ بس (للـ Realtime) ونفس شروط القراءة السابقة.
-- staff_members: بدون أي وصول مباشر (فيه بصمة الرمز السري والرواتب).
-- supplier_profiles: المورد يسجّل ملفه بنفسه (insert) بس، والتعديل من الخادم.
begin;

drop policy "users can manage their org branches" on public."branches";
create policy "users can manage their org branches_read" on public."branches" as permissive for select to public
  using ((org_id IN ( SELECT profiles.org_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
drop policy "org_branch_access" on public."cashier_closings";
create policy "org_branch_access_read" on public."cashier_closings" as permissive for select to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy "org_own_chat_messages" on public."chat_messages";
create policy "org_own_chat_messages_read" on public."chat_messages" as permissive for select to public
  using ((org_id = my_org_id()));
drop policy "supplier_own_chat_messages" on public."chat_messages";
create policy "supplier_own_chat_messages_read" on public."chat_messages" as permissive for select to public
  using ((supplier_id = auth.uid()));
drop policy "org_branch_access" on public."notifications";
create policy "org_branch_access_read" on public."notifications" as permissive for select to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy "supplier_write_org_reviews" on public."org_reviews";
drop policy "organizations_own_update" on public."organizations";
drop policy "org_branch_access_via_product" on public."product_suppliers";
create policy "org_branch_access_via_product_read" on public."product_suppliers" as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_suppliers.product_id) AND (p.org_id = my_org_id()) AND branch_ok(p.branch_id)))));
drop policy "org_branch_access" on public."products";
create policy "org_branch_access_read" on public."products" as permissive for select to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy "insert_own_profile" on public."profiles";
drop policy "profiles_insert" on public."profiles";
drop policy "profiles_update" on public."profiles";
drop policy "update_own_profile" on public."profiles";
drop policy "org_branch_access" on public."purchases";
create policy "org_branch_access_read" on public."purchases" as permissive for select to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy "org_own_quote_requests" on public."quote_requests";
create policy "org_own_quote_requests_read" on public."quote_requests" as permissive for select to public
  using ((org_id = my_org_id()));
drop policy "supplier_own_quote_requests" on public."quote_requests";
create policy "supplier_own_quote_requests_read" on public."quote_requests" as permissive for select to public
  using ((supplier_id = auth.uid()));
drop policy "org members can manage recipe items" on public."recipe_items";
create policy "org members can manage recipe items_read" on public."recipe_items" as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM (recipes r
     JOIN profiles pr ON ((pr.org_id = r.org_id)))
  WHERE ((r.id = recipe_items.recipe_id) AND (pr.id = auth.uid())))));
drop policy "org members can insert recipe sales log" on public."recipe_sales_log";
drop policy "org members can manage recipes" on public."recipes";
create policy "org members can manage recipes_read" on public."recipes" as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM profiles pr
  WHERE ((pr.org_id = recipes.org_id) AND (pr.id = auth.uid())))));
drop policy "org_branch_access" on public."staff_members";
drop policy "movements_insert_own_org" on public."stock_movements";
drop policy "org_branch_access" on public."stock_movements";
create policy "org_branch_access_read" on public."stock_movements" as permissive for select to public
  using ((product_id IN ( SELECT products.id
   FROM products
  WHERE ((products.org_id = my_org_id()) AND branch_ok(products.branch_id)))));
drop policy "supplier_own_catalog" on public."supplier_catalog_items";
create policy "supplier_own_catalog_read" on public."supplier_catalog_items" as permissive for select to public
  using ((supplier_id = auth.uid()));
drop policy "org_branch_access" on public."supplier_orders";
create policy "org_branch_access_read" on public."supplier_orders" as permissive for select to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy "supplier_own_profile" on public."supplier_profiles";
create policy "supplier_own_profile_read" on public."supplier_profiles" as permissive for select to public
  using ((id = auth.uid()));
create policy "supplier_own_profile_insert" on public."supplier_profiles" as permissive for insert to authenticated
  with check (id = auth.uid() and coalesce(status, 'active') = 'active');
drop policy "supplier_own_reps" on public."supplier_reps";
create policy "supplier_own_reps_read" on public."supplier_reps" as permissive for select to public
  using ((supplier_id = auth.uid()));
drop policy "org_own_reviews_write" on public."supplier_reviews";
drop policy "org_branch_access" on public."suppliers";
create policy "org_branch_access_read" on public."suppliers" as permissive for select to public
  using (((org_id = my_org_id()) AND branch_ok(branch_id)));
drop policy "Users can manage their own seen features" on public."user_seen_features";
create policy "Users can manage their own seen features_read" on public."user_seen_features" as permissive for select to public
  using ((profile_id = auth.uid()));
drop policy "logs_insert" on public."whatsapp_logs";

-- دوال حذف الحسابات: ما يستخدمها الكود، وكانت مفتوحة للجميع
revoke execute on function public.delete_auth_user(uuid) from public, anon, authenticated;
revoke execute on function public.delete_auth_identity(uuid) from public, anon, authenticated;
grant execute on function public.delete_auth_user(uuid) to service_role;
grant execute on function public.delete_auth_identity(uuid) to service_role;

commit;
