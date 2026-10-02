import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { MAX_BUSINESS_DAY_START_HOUR } from '@/lib/businessDate'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// إعدادات المنشأة اللي تعدّلها صفحات لوحة التحكم — قوائم مسموحة فقط
const BASIC_FIELDS = 'shop_open_time,shop_close_time,business_day_start_hour,notify_cashier_closing_wa'
// scope=full: صفحة الإعدادات (استعلام منفصل عشان صفحات ثانية تبقى على الحقول الأساسية فقط)
const FULL_FIELDS = 'whatsapp_number,name,notify_schedule,notify_time,notify_days,notify_cashier_closing_wa,notify_supplier_wa,last_notified_at,last_backup_at,max_branches,logo_url,plan,subscription_ends_at,billing_cycle,staff_salary_visible,overtime_mode,overtime_multiplier,overtime_fixed_rate,overtime_min_minutes'
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
    if ('business_day_start_hour' in body) {
      const h = Number(body.business_day_start_hour)
      if (!Number.isInteger(h) || h < 0 || h > MAX_BUSINESS_DAY_START_HOUR) return NextResponse.json({ error: 'ساعة بداية اليوم غير صالحة' }, { status: 400 })
      update.business_day_start_hour = h
    }
    if ('notify_cashier_closing_wa' in body) update.notify_cashier_closing_wa = !!body.notify_cashier_closing_wa
    if ('notify_supplier_wa' in body) update.notify_supplier_wa = !!body.notify_supplier_wa
    if ('staff_salary_visible' in body) update.staff_salary_visible = !!body.staff_salary_visible
    // إعدادات الأوفر تايم (صفحة الحضور والانصراف)
    if ('overtime_mode' in body) {
      if (!['auto', 'fixed', 'off'].includes(body.overtime_mode)) return NextResponse.json({ error: 'طريقة الأوفر تايم غير صالحة' }, { status: 400 })
      update.overtime_mode = body.overtime_mode
    }
    if ('overtime_multiplier' in body) {
      const m = Number(body.overtime_multiplier)
      if (!Number.isFinite(m) || m < 1 || m > 3) return NextResponse.json({ error: 'المضاعف من 1 إلى 3' }, { status: 400 })
      update.overtime_multiplier = Math.round(m * 100) / 100
    }
    if ('overtime_fixed_rate' in body) {
      const r = body.overtime_fixed_rate === '' || body.overtime_fixed_rate == null ? null : Number(body.overtime_fixed_rate)
      if (r !== null && (!Number.isFinite(r) || r < 0 || r > 10000)) return NextResponse.json({ error: 'مبلغ الساعة غير صالح' }, { status: 400 })
      update.overtime_fixed_rate = r
    }
    if ('overtime_min_minutes' in body) {
      const n = Number(body.overtime_min_minutes)
      if (!Number.isInteger(n) || n < 0 || n > 240) return NextResponse.json({ error: 'أقل مدة من 0 إلى 240 دقيقة' }, { status: 400 })
      update.overtime_min_minutes = n
    }
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
