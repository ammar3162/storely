import { NextResponse } from 'next/server'
import { deleteOrgCompletely } from '@/lib/deleteOrg'

export async function POST(req: Request) {
  try {
    const { org_id, user_id } = await req.json()
    if (!org_id || !user_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const result = await deleteOrgCompletely(org_id, user_id)

    if (!result.success) {
      console.error('delete-account partial failure:', result.errors)
      return NextResponse.json({ error: 'حدث خطأ أثناء الحذف — راجع الدعم الفني', details: result.errors }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
