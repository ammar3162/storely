import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    if (!(await requirePermission(adminKey, 'manage_users'))) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { userId, orgId } = await req.json()
    if (!userId) return NextResponse.json({ success: false, message: 'userId مطلوب' })

    const deleteErrors: string[] = []

    if (orgId) {
      // حذف بترتيب صحيح يحترم قيود الربط (Foreign Keys) — الجداول التابعة أول، ثم الأساسية، ثم المؤسسة نفسها
      const { data: prods } = await supabase.from('products').select('id').eq('org_id', orgId)
      const pids = (prods || []).map((p: any) => p.id)

      // 1) جداول تعتمد على المنتجات
      if (pids.length > 0) {
        const r1 = await supabase.from('stock_movements').delete().in('product_id', pids)
        if (r1.error) deleteErrors.push(`stock_movements: ${r1.error.message}`)
        const r2 = await (supabase as any).from('product_suppliers').delete().in('product_id', pids)
        if (r2.error) deleteErrors.push(`product_suppliers: ${r2.error.message}`)
        const r3 = await (supabase as any).from('supplier_order_logs').delete().in('product_id', pids)
        if (r3.error) deleteErrors.push(`supplier_order_logs: ${r3.error.message}`)
      }

      // 2) جداول تعتمد على الموردين
      const { data: sups } = await supabase.from('suppliers').select('id').eq('org_id', orgId)
      const sids = (sups || []).map((s: any) => s.id)
      if (sids.length > 0) {
        const r4 = await (supabase as any).from('supplier_performance_log').delete().in('supplier_id', sids)
        if (r4.error) deleteErrors.push(`supplier_performance_log: ${r4.error.message}`)
      }

      // 3) جداول تعتمد على المؤسسة مباشرة (لا تعتمد على منتجات/موردين/فروع)
      const directTables = ['notifications','purchases','staff_members','whatsapp_logs','whatsapp_sessions','push_subscriptions','cashier_closings','fixed_expenses','monthly_fixed_expenses','inventory_snapshots','supplier_orders']
      for (const t of directTables) {
        const r = await (supabase as any).from(t).delete().eq('org_id', orgId)
        if (r.error) deleteErrors.push(`${t}: ${r.error.message}`)
      }

      // 4) المنتجات والموردين (بعد ما نظّفنا كل التابع لهم)
      const r5 = await supabase.from('products').delete().eq('org_id', orgId)
      if (r5.error) deleteErrors.push(`products: ${r5.error.message}`)
      const r6 = await supabase.from('suppliers').delete().eq('org_id', orgId)
      if (r6.error) deleteErrors.push(`suppliers: ${r6.error.message}`)

      // 5) الفروع (بعد ما حذفنا كل شي يشير لها)
      const r7 = await supabase.from('branches').delete().eq('org_id', orgId)
      if (r7.error) deleteErrors.push(`branches: ${r7.error.message}`)

      // 6) الملف الشخصي
      const { error: profileErr } = await supabase.from('profiles').delete().eq('org_id', orgId)
      if (profileErr) deleteErrors.push(`profiles: ${profileErr.message}`)

      // حذف ملفات النسخ الاحتياطي من التخزين قبل حذف المؤسسة
      try {
        const { data: backupFiles } = await supabase.storage.from('backups').list(orgId)
        if (backupFiles && backupFiles.length > 0) {
          await supabase.storage.from('backups').remove(backupFiles.map((f: any) => `${orgId}/${f.name}`))
        }
      } catch (e: any) { deleteErrors.push(`backups storage: ${e.message}`) }

      // 7) المؤسسة نفسها (آخر خطوة، بعد ما تأكدنا كل شي تابع لها انحذف)
      const { error: orgErr } = await supabase.from('organizations').delete().eq('id', orgId)
      if (orgErr) deleteErrors.push(`organizations: ${orgErr.message}`)
    } else {
      await supabase.from('profiles').delete().eq('id', userId)
    }

    if (deleteErrors.length > 0) {
      console.error('delete-user partial failure:', deleteErrors)
      return NextResponse.json({ success: false, error: 'حذف جزئي — راجع التفاصيل', details: deleteErrors }, { status: 500 })
    }

    await supabase.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
