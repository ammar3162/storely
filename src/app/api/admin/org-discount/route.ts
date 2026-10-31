import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// خصم خاص لمنشأة: type = percent (1–100) أو amount (ريال شهرياً)، أو type = null لإلغاء الخصم
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const { orgId, orgName, type, value, note, until } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    let update: Record<string, unknown>
    if (type == null) {
      update = { discount_type: null, discount_value: null, discount_note: null, discount_until: null }
    } else {
      const v = Number(value)
      if (type !== 'percent' && type !== 'amount') return NextResponse.json({ error: 'نوع الخصم غير صحيح' }, { status: 400 })
      if (!(v > 0) || (type === 'percent' && v > 100)) return NextResponse.json({ error: type === 'percent' ? 'النسبة بين 1 و 100' : 'المبلغ لازم يكون أكبر من صفر' }, { status: 400 })
      if (until && !DATE_RE.test(String(until))) return NextResponse.json({ error: 'تاريخ الانتهاء غير صحيح' }, { status: 400 })
      update = {
        discount_type: type, discount_value: Math.round(v * 100) / 100,
        discount_note: typeof note === 'string' ? note.trim().slice(0, 60) || null : null,
        discount_until: until || null,
      }
    }

    const { data, error } = await sb().from('organizations').update(update as any).eq('id', orgId).select('id')
    if (error) return NextResponse.json({ error: 'فشل حفظ الخصم' }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'المنشأة غير موجودة' }, { status: 404 })
    await logAdminAction(admin, type == null ? 'remove_discount' : 'set_discount', orgId, orgName || null, update)
    return NextResponse.json({ success: true, discount: update })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
