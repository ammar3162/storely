-- فهارس لاستعلامات كشف الراتب والتقارير والطلبات — تحافظ على السرعة مع كثرة الموظفين والسجلات
create index if not exists idx_staff_attendance_staff_time on public.staff_attendance (staff_id, recorded_at desc);
create index if not exists idx_payroll_adj_staff_time on public.staff_payroll_adjustments (staff_id, created_at);
create index if not exists idx_payroll_adj_org_time on public.staff_payroll_adjustments (org_id, created_at desc);
create index if not exists idx_leave_requests_staff on public.staff_leave_requests (staff_id, start_date);
create index if not exists idx_leave_requests_org on public.staff_leave_requests (org_id, requested_at desc);
create index if not exists idx_cashier_closings_staff_date on public.cashier_closings (staff_id, closing_date);
create index if not exists idx_permission_requests_org on public.attendance_permission_requests (org_id, requested_at desc);
create index if not exists idx_notifications_ref on public.notifications (ref_type, ref_id) where ref_type is not null;
