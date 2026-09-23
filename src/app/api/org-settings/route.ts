import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// إعدادات المنشأة اللي تعدّلها صفحات لوحة التحكم — قائمة مسموحة فقط
const READABLE = 'shop_open_time,shop_close_time,notify_cashier_closing_wa'
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

export async function GET(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data, error } = await sb().from('organizations').select(READABLE).eq('id', org_id).single()
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, settings: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// ساعات العمل: { shop_open_time, shop_close_time } — المالك فقط
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id } = body
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

    const update: Record<string, unknown> = {}
    for (const k of ['shop_open_time', 'shop_close_time'] as const) {
      if (k in body) {
        if (!TIME_RE.test(String(body[k] || ''))) return NextResponse.json({ error: 'وقت غير صالح' }, { status: 400 })
        update[k] = body[k]
      }
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const { error } = await sb().from('organizations').update(update as any).eq('id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
