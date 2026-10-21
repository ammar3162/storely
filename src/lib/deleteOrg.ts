import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * حذف مؤسسة كاملة بشكل آمن وموثوق — يحترم كل قيود الربط (Foreign Keys)
 * بترتيب صحيح (الجداول التابعة أول، ثم الأساسية، ثم المؤسسة نفسها)،
 * ويتحقق من نجاح كل خطوة قبل ما يكمل للخطوة اللي بعدها.
 * تُستخدم من مسارين: حذف الأدمن اليدوي، وحذف الحساب الذاتي من العميل.
 */
export async function deleteOrgCompletely(orgId: string, userId?: string): Promise<{ success: boolean; errors: string[] }> {
  const supabase = sb()
  const errors: string[] = []

  // حذف المنشأة كاملة: إقفالات الشهور تنشال أول — وإلا قاعدة البيانات ترفض حذف مشترياتها وإقفالات كاشيرها
  const rLocks = await (supabase as any).from('period_locks').delete().eq('org_id', orgId)
  if (rLocks.error) errors.push(`period_locks: ${rLocks.error.message}`)

  const { data: prods } = await supabase.from('products').select('id').eq('org_id', orgId)
  const pids = (prods || []).map((p: any) => p.id)

  // 1) جداول تعتمد على المنتجات
  if (pids.length > 0) {
    const r1 = await supabase.from('stock_movements').delete().in('product_id', pids)
    if (r1.error) errors.push(`stock_movements: ${r1.error.message}`)
    const r2 = await (supabase as any).from('product_suppliers').delete().in('product_id', pids)
    if (r2.error) errors.push(`product_suppliers: ${r2.error.message}`)
    const r3 = await (supabase as any).from('supplier_order_logs').delete().in('product_id', pids)
    if (r3.error) errors.push(`supplier_order_logs: ${r3.error.message}`)
  }

  // 2) جداول تعتمد على الموردين
  const { data: sups } = await supabase.from('suppliers').select('id').eq('org_id', orgId)
  const sids = (sups || []).map((s: any) => s.id)
  if (sids.length > 0) {
    const r4 = await (supabase as any).from('supplier_performance_log').delete().in('supplier_id', sids)
    if (r4.error) errors.push(`supplier_performance_log: ${r4.error.message}`)
  }

  // 3) جداول تعتمد على المؤسسة مباشرة — كل جدول قيده يمنع حذف المؤسسة لازم يكون هنا
  // (ملفات الموظفين قبل staff_members، وprofitability_closings قبل profiles لأنها تشير لها)
  const directTables = [
    'stock_movements','staff_tasks','staff_payroll_adjustments','staff_leave_requests','staff_notifications',
    'profitability_closings',
    'notifications','purchases','staff_members','whatsapp_logs',
    'push_subscriptions','cashier_closings','fixed_expenses','monthly_fixed_expenses',
    'inventory_snapshots','supplier_orders','data_backups',
  ]
  for (const t of directTables) {
    const r = await (supabase as any).from(t).delete().eq('org_id', orgId)
    if (r.error) errors.push(`${t}: ${r.error.message}`)
  }

  // 4) المنتجات والموردين
  const r5 = await supabase.from('products').delete().eq('org_id', orgId)
  if (r5.error) errors.push(`products: ${r5.error.message}`)
  const r6 = await supabase.from('suppliers').delete().eq('org_id', orgId)
  if (r6.error) errors.push(`suppliers: ${r6.error.message}`)

  // الاشتراكات بعد الموردين والموظفين (يشيرون لها عبر addon_subscription_id)
  const rSub = await (supabase as any).from('org_addon_subscriptions').delete().eq('org_id', orgId)
  if (rSub.error) errors.push(`org_addon_subscriptions: ${rSub.error.message}`)
  // طلبات العرض التجريبي تبقى، بس نفك ربطها بالمنشأة
  const rDemo = await (supabase as any).from('demo_requests').update({ matched_org_id: null }).eq('matched_org_id', orgId)
  if (rDemo.error) errors.push(`demo_requests: ${rDemo.error.message}`)

  // 5) الفروع
  const r7 = await supabase.from('branches').delete().eq('org_id', orgId)
  if (r7.error) errors.push(`branches: ${r7.error.message}`)

  // حذف ملفات النسخ الاحتياطي من التخزين قبل حذف المؤسسة
  try {
    const { data: backupFiles } = await supabase.storage.from('backups').list(orgId)
    if (backupFiles && backupFiles.length > 0) {
      await supabase.storage.from('backups').remove(backupFiles.map((f: any) => `${orgId}/${f.name}`))
    }
  } catch (e: any) { errors.push(`backups storage: ${e.message}`) }

  // 6+7) الملف الشخصي والمؤسسة نفسها — خطوتين أخيرتين مترابطتين، وبس لو كل شي قبلهم نجح
  // (قبل هذا الإصلاح: كان حذف profiles ينفّذ بدون شرط، فلو فشلت خطوة سابقة كان يبقى صف
  // organizations "يتيم" بدون صاحب حساب يقدر يعيد محاولة الحذف — راجع سجل الحوادث)
  if (errors.length === 0) {
    const { error: profileErr } = await supabase.from('profiles').delete().eq('org_id', orgId)
    if (profileErr) errors.push(`profiles: ${profileErr.message}`)
  }

  if (errors.length === 0) {
    const { error: orgErr } = await supabase.from('organizations').delete().eq('id', orgId)
    if (orgErr) errors.push(`organizations: ${orgErr.message}`)
  }

  // حذف حساب الدخول — بس لو كل شي نجح بدون أي خطأ (يمنع حذف حساب الدخول مع بقاء بيانات عالقة)
  if (errors.length === 0 && userId) {
    await supabase.auth.admin.deleteUser(userId).catch((e: any) => errors.push(`auth user: ${e.message}`))
  }

  return { success: errors.length === 0, errors }
}

/**
 * حذف فرع واحد بالكامل بشكل آمن — يحترم كل قيود الربط بترتيب صحيح.
 * لا يحذف أبداً الملف الشخصي لصاحب الحساب (profiles) — بس يفكّ ارتباطه بالفرع (branch_id = null)
 * لأن حذف حساب دخول العميل بسبب حذف فرع كارثة أكبر بكثير من فقدان تفضيل الفرع الافتراضي.
 */
export async function deleteBranchCompletely(branchId: string, orgId: string): Promise<{ success: boolean; errors: string[]; lockedMonths?: string[] }> {
  const supabase = sb()
  const errors: string[] = []

  // قبل ما نحذف أي شي: لو الفرع فيه مشتريات أو إقفالات كاشير بشهر مقفل، قاعدة البيانات بترفض حذفها
  // ونطلع بحذف ناقص — فنوقف من البداية بدون ما نلمس شي
  const lockedMonths = await branchLockedMonths(supabase, orgId, branchId)
  if (lockedMonths.length) return { success: false, errors: [], lockedMonths }

  const { data: prods } = await supabase.from('products').select('id').eq('org_id', orgId).eq('branch_id', branchId)
  const pids = (prods || []).map((p: any) => p.id)

  if (pids.length > 0) {
    const r1 = await supabase.from('stock_movements').delete().in('product_id', pids)
    if (r1.error) errors.push(`stock_movements: ${r1.error.message}`)
    const r2 = await (supabase as any).from('product_suppliers').delete().in('product_id', pids)
    if (r2.error) errors.push(`product_suppliers: ${r2.error.message}`)
    const r3 = await (supabase as any).from('supplier_order_logs').delete().in('product_id', pids)
    if (r3.error) errors.push(`supplier_order_logs: ${r3.error.message}`)
  }

  const { data: sups } = await supabase.from('suppliers').select('id').eq('org_id', orgId).eq('branch_id', branchId)
  const sids = (sups || []).map((s: any) => s.id)
  if (sids.length > 0) {
    const r4 = await (supabase as any).from('supplier_performance_log').delete().in('supplier_id', sids)
    if (r4.error) errors.push(`supplier_performance_log: ${r4.error.message}`)
  }

  const directTables = ['staff_tasks', 'purchases', 'cashier_closings', 'supplier_orders', 'staff_members', 'notifications']
  for (const t of directTables) {
    const r = await (supabase as any).from(t).delete().eq('branch_id', branchId)
    if (r.error) errors.push(`${t}: ${r.error.message}`)
  }
  // حركات أصناف فروع ثانية (تحويل مخزون) واشتراك الفرع الإضافي: نفك الربط بس — حذفها يغيّر كميات فروع ثانية
  for (const t of ['stock_movements', 'org_addon_subscriptions']) {
    const r = await (supabase as any).from(t).update({ branch_id: null }).eq('branch_id', branchId)
    if (r.error) errors.push(`${t}: ${r.error.message}`)
  }

  const r5 = await supabase.from('products').delete().eq('branch_id', branchId)
  if (r5.error) errors.push(`products: ${r5.error.message}`)
  const r6 = await supabase.from('suppliers').delete().eq('branch_id', branchId)
  if (r6.error) errors.push(`suppliers: ${r6.error.message}`)

  // فك ارتباط ملف صاحب الحساب بالفرع بدل حذفه — يحمي تسجيل الدخول
  const rProf = await (supabase as any).from('profiles').update({ branch_id: null }).eq('branch_id', branchId)
  if (rProf.error) errors.push(`profiles: ${rProf.error.message}`)

  if (errors.length === 0) {
    const { error: branchErr } = await supabase.from('branches').delete().eq('id', branchId)
    if (branchErr) errors.push(`branches: ${branchErr.message}`)
    // المنيو بالفروع: الفرع يطلع من الاشتراك والكمية (الفاتورة) تنقص — أصنافه انحذفت مع الفرع (on delete cascade)
    if (!branchErr) {
      const { data: menuSubs } = await (supabase as any).from('org_addon_subscriptions').select('id,branch_ids').eq('org_id', orgId).contains('branch_ids', [branchId])
      for (const s of menuSubs || []) {
        const rest = (s.branch_ids || []).filter((id: string) => id !== branchId)
        const r = await (supabase as any).from('org_addon_subscriptions')
          .update(rest.length ? { branch_ids: rest, quantity: rest.length } : { branch_ids: null, quantity: 1 }).eq('id', s.id)
        if (r.error) errors.push(`org_addon_subscriptions(menu): ${r.error.message}`)
      }
    }
  }

  return { success: errors.length === 0, errors }
}

const nextMonth = (m: string) => { const y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7)); return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10) }

/** الشهور المقفلة اللي فيها مشتريات أو إقفالات كاشير لهالفرع (نفس حساب قاعدة البيانات: الشهر بتوقيت الرياض) */
export async function branchLockedMonths(db: any, orgId: string, branchId: string): Promise<string[]> {
  const { data: locks } = await db.from('period_locks').select('month').eq('org_id', orgId)
  const out: string[] = []
  for (const l of (locks || []) as { month: string }[]) {
    const m = String(l.month).slice(0, 10), n = nextMonth(m)
    const [{ count: p }, { count: c }] = await Promise.all([
      db.from('purchases').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('branch_id', branchId)
        .gte('created_at', `${m}T00:00:00+03:00`).lt('created_at', `${n}T00:00:00+03:00`),
      db.from('cashier_closings').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('branch_id', branchId)
        .gte('closing_date', m).lt('closing_date', n),
    ])
    if ((p || 0) + (c || 0) > 0) out.push(m)
  }
  return out.sort()
}
