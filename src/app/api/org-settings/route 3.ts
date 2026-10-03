import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// إعدادات المنشأة اللي تعدّلها صفحات لوحة التحكم — قوائم مسموحة فقط
const BASIC_FIELDS = 'shop_open_time,shop_close_time,notify_cashier_closing_wa'
// scope=full: صفحة الإعدادات (استعلام منفصل عشان صفحات ثانية تبقى على الحقول الأساسية فقط)
const FULL_FIELDS = 'whatsapp_number,name,notify_schedule,notify_time,notify_days,notify_cashier_closing_wa,notify_supplier_wa,last_notified_at,last_backup_at,max_branches,logo_url,plan,subscription_ends_at,billing_cycle'
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const full = searchParams.get('scope') === 'full'
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data, error } = await sb().from('organizations').select(full ? FULL_FIELDS : BASIC_FIELDS).eq('id', org_id).single()
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, settings: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعديل إعدادات المنشأة — المالك فقط، والحقول المسموحة فقط
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id } = body
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

    const update: Record<string, unknown> = {}
    for (const k of ['shop_open_time', 'shop_close_time', 'notify_time'] as const) {
      if (k in body) {
        if (!TIME_RE.test(String(body[k] || ''))) return NextResponse.json({ error: 'وقت غير صالح' }, { status: 400 })
        update[k] = body[k]
      }
    }
    if ('name' in body) {
      const name = String(body.name || '').trim()
      if (!name) return NextResponse.json({ error: 'أدخل اسم المنشأة' }, { status: 400 })
      update.name = name
    }
    if ('whatsapp_number' in body) update.whatsapp_number = String(body.whatsapp_number || '').trim()
    if ('notify_schedule' in body) {
      if (!['daily', 'weekly', 'manual'].includes(body.notify_schedule)) return NextResponse.json({ error: 'جدولة غير صالحة' }, { status: 400 })
      update.notify_schedule = body.notify_schedule
    }
    if ('notify_days' in body) {
      if (!Array.isArray(body.notify_days) || body.notify_days.some((d: any) => !/^[0-6]$/.test(String(d)))) {
        return NextResponse.json({ error: 'أيام غير صالحة' }, { status: 400 })
      }
      update.notify_days = body.notify_days.map(String)
    }
    if ('notify_cashier_closing_wa' in body) update.notify_cashier_closing_wa = !!body.notify_cashier_closing_wa
    if ('notify_supplier_wa' in body) update.notify_supplier_wa = !!body.notify_supplier_wa
    if ('logo_url' in body) {
      // الشعار يُرفع لتخزين Supabase الخاص بالمشروع — ما نقبل روابط خارجية
      const url = String(body.logo_url || '')
      const allowed = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`
      if (url && !url.startsWith(allowed)) return NextResponse.json({ error: 'رابط غير صالح' }, { status: 400 })
      update.logo_url = url || null
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const { error } = await sb().from('organizations').update(update as any).eq('id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
