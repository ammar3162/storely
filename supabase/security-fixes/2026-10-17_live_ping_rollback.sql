do $$
declare t text;
begin
  foreach t in array array['products','stock_movements','purchases','cashier_closings','staff_members','staff_attendance',
    'staff_leave_requests','staff_payroll_adjustments','attendance_permission_requests','suppliers','supplier_orders','staff_tasks',
    'notifications','shifts','branches','fixed_expenses','monthly_fixed_expenses','delivery_income','quote_requests','staff_notifications'] loop
    execute format('drop trigger if exists trg_org_live_ping on public.%I', t);
  end loop;
end $$;
drop function if exists public.org_live_ping();
