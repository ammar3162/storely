import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteBranchCompletely } from '@/lib/deleteOrg'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { branch_id, org_id } = await req.json()
    if (!branch_id || !org_id) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // تحقق من هوية المتصل الفعلية عبر الجلسة الموثوقة (مو من قيم الطلب)
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()

    // تحقق إن الفرع فعلاً يخص هذي المؤسسة
    const { data: branch } = await db.from('branches').select('id,org_id').eq('id', branch_id).maybeSingle()
    if (!branch || branch.org_id !== org_id) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    }

    // يمنع حذف آخر فرع متبقي (نشط أو موقوف)
    const { count } = await db.from('branches').select('id', { count: 'exact', head: true }).eq('org_id', org_id)
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: 'لا يمكن حذف الفرع الوحيد المتبقي بالمؤسسة' }, { status: 400 })
    }

    const result = await deleteBranchCompletely(branch_id, org_id)
    if (!result.success) {
      console.error('delete-branch partial failure:', result.errors)
      return NextResponse.json({ error: 'حدث خطأ أثناء الحذف — راجع الدعم الفني', details: result.errors }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
