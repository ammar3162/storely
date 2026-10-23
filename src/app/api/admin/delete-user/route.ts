import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { deleteOrgCompletely } from '@/lib/deleteOrg'

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    const admin = await requirePermission(adminKey, 'manage_users')
    if (!admin) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { userId, orgId } = await req.json()
    if (!userId) return NextResponse.json({ success: false, message: 'userId مطلوب' })

    // نجيب اسم المؤسسة قبل الحذف (بعد الحذف ما راح يكون موجود نسجّله بسجل التدقيق)
    let orgNameForLog: string | null = null
    if (orgId) {
      const { data: orgRow } = await supabase.from('organizations').select('name').eq('id', orgId).maybeSingle()
      orgNameForLog = (orgRow as any)?.name || null
    }

    // نفس الحذف المختبَر اللي يستخدمه العميل لحذف حسابه (lib/deleteOrg) — نسخة وحدة بدل نسختين
    if (orgId) {
      const r = await deleteOrgCompletely(orgId, userId)
      if (!r.success) {
        console.error('delete-user failure:', r.errors)
        return NextResponse.json({ success: false, error: r.errors[0] ? `فشل الحذف: ${r.errors[0]}` : 'فشل الحذف', details: r.errors }, { status: 500 })
      }
    } else {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) return NextResponse.json({ success: false, error: `فشل الحذف: ${error.message}` }, { status: 500 })
      await supabase.auth.admin.deleteUser(userId).catch(() => {})
    }

    await logAdminAction(admin, 'delete_user', orgId || null, orgNameForLog, { userId })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
