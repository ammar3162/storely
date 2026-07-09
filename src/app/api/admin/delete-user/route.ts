import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // تحقق من مفتاح الأدمن
    const adminKey = req.headers.get('x-admin-key')
    const correct  = process.env.ADMIN_PASSWORD
    if (!adminKey || adminKey !== correct) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { userId, orgId } = await req.json()
    if (!userId) return NextResponse.json({ success: false, message: 'userId مطلوب' })

    const deleteErrors: string[] = []

    if (orgId) {
      const { data: prods } = await supabase.from('products').select('id').eq('org_id', orgId)
      const pids = (prods || []).map((p: any) => p.id)
      if (pids.length > 0) {
        const { error } = await supabase.from('stock_movements').delete().in('product_id', pids)
        if (error) deleteErrors.push(`stock_movements: ${error.message}`)
      }
      const results = await Promise.all([
        supabase.from('products').delete().eq('org_id', orgId),
        supabase.from('notifications').delete().eq('org_id', orgId),
        supabase.from('purchases').delete().eq('org_id', orgId),
        supabase.from('branches').delete().eq('org_id', orgId),
        supabase.from('suppliers').delete().eq('org_id', orgId),
        supabase.from('staff_members').delete().eq('org_id', orgId),
        supabase.from('whatsapp_logs').delete().eq('org_id', orgId),
        supabase.from('whatsapp_sessions').delete().eq('org_id', orgId),
        supabase.from('supplier_orders').delete().eq('org_id', orgId),
        supabase.from('push_subscriptions').delete().eq('org_id', orgId),
        supabase.from('cashier_closings').delete().eq('org_id', orgId),
        supabase.from('fixed_expenses').delete().eq('org_id', orgId),
        supabase.from('monthly_fixed_expenses').delete().eq('org_id', orgId),
        supabase.from('inventory_snapshots').delete().eq('org_id', orgId),
      ])
      const tableNames = ['products','notifications','purchases','branches','suppliers','staff_members','whatsapp_logs','whatsapp_sessions','supplier_orders','push_subscriptions','cashier_closings','fixed_expenses','monthly_fixed_expenses','inventory_snapshots']
      results.forEach((r: any, i: number) => { if (r.error) deleteErrors.push(`${tableNames[i]}: ${r.error.message}`) })

      const { error: profileErr } = await supabase.from('profiles').delete().eq('org_id', orgId)
      if (profileErr) deleteErrors.push(`profiles: ${profileErr.message}`)

      // حذف ملفات النسخ الاحتياطي من التخزين (Storage) قبل حذف المؤسسة
      try {
        const { data: backupFiles } = await supabase.storage.from('backups').list(orgId)
        if (backupFiles && backupFiles.length > 0) {
          await supabase.storage.from('backups').remove(backupFiles.map((f: any) => `${orgId}/${f.name}`))
        }
      } catch (e: any) { deleteErrors.push(`backups storage: ${e.message}`) }

      const { error: orgErr } = await supabase.from('organizations').delete().eq('id', orgId)
      if (orgErr) deleteErrors.push(`organizations: ${orgErr.message}`)
    } else {
      await supabase.from('profiles').delete().eq('id', userId)
    }

    if (deleteErrors.length > 0) {
      console.error('delete-user partial failure:', deleteErrors)
      return NextResponse.json({ success: false, error: 'حذف جزئي — راجع السجل', details: deleteErrors })
    }

    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
