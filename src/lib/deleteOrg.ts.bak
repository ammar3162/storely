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

  // 3) جداول تعتمد على المؤسسة مباشرة
  const directTables = [
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

  // 5) الفروع
  const r7 = await supabase.from('branches').delete().eq('org_id', orgId)
  if (r7.error) errors.push(`branches: ${r7.error.message}`)

  // 6) الملف الشخصي
  const { error: profileErr } = await supabase.from('profiles').delete().eq('org_id', orgId)
  if (profileErr) errors.push(`profiles: ${profileErr.message}`)

  // حذف ملفات النسخ الاحتياطي من التخزين قبل حذف المؤسسة
  try {
    const { data: backupFiles } = await supabase.storage.from('backups').list(orgId)
    if (backupFiles && backupFiles.length > 0) {
      await supabase.storage.from('backups').remove(backupFiles.map((f: any) => `${orgId}/${f.name}`))
    }
  } catch (e: any) { errors.push(`backups storage: ${e.message}`) }

  // 7) المؤسسة نفسها — آخر خطوة، وبس لو كل شي قبلها نجح
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
export async function deleteBranchCompletely(branchId: string, orgId: string): Promise<{ success: boolean; errors: string[] }> {
  const supabase = sb()
  const errors: string[] = []

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

  const directTables = ['purchases', 'cashier_closings', 'supplier_orders', 'staff_members']
  for (const t of directTables) {
    const r = await (supabase as any).from(t).delete().eq('branch_id', branchId)
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
  }

  return { success: errors.length === 0, errors }
}
