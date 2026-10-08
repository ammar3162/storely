import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { formatPhone } from '@/lib/whatsapp'
import { ACC_SECTIONS } from '@/lib/accountantExport'
import { latestPeriod, saudiToday, scheduleToday, manualPeriod, customPeriod, type AccFrequency, type ManualPeriodKey } from '@/lib/accountantSchedule'
import { sendAccountantReport } from '@/lib/accountantSend'
import { isSubscriptionActive } from '@/lib/subscription'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FIELDS = 'id,org_id,branch_id,name,email,whatsapp,channels,sections,frequency,weekday,month_day,send_hour,vat_registered,is_active,last_period_end,updated_at'
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i
const UUID_RE = /^[0-9a-f-]{36}$/i
const TEST_PER_HOUR = 5

// الربط مع المحاسب — للمالك بس (التقرير فيه الرواتب والأرقام المالية)
async function ownerOnly(org_id: string | null) {
  if (!org_id) return { error: NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 }) }
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return { error: NextResponse.json({ error: access.error }, { status: access.status }) }
  if (access.role !== 'owner') return { error: NextResponse.json({ error: 'الربط مع المحاسب متاح لمالك الحساب بس' }, { status: 403 }) }
  return { ok: true as const }
}

export async function GET(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id')
    const g = await ownerOnly(org_id); if (g.error) return g.error
    const db = sb()
    const [{ data: link }, { data: reports }] = await Promise.all([
      db.from('accountant_links').select(FIELDS).eq('org_id', org_id!).maybeSingle(),
      db.from('accountant_reports').select('id,period_start,period_end,is_test,email_status,whatsapp_status,opened_at,created_at').eq('org_id', org_id!).order('created_at', { ascending: false }).limit(10),
    ])
    return NextResponse.json({ success: true, link: link || null, reports: reports || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حفظ الإعدادات
export async function PUT(req: Request) {
  try {
    const b = await req.json()
    const g = await ownerOnly(b.org_id); if (g.error) return g.error

    const name = String(b.name || '').trim().slice(0, 80)
    if (!name) return NextResponse.json({ error: 'اكتب اسم المحاسب' }, { status: 400 })
    const email = String(b.email || '').trim().toLowerCase() || null
    if (email && (!EMAIL_RE.test(email) || email.length > 254)) return NextResponse.json({ error: 'الإيميل غير صحيح' }, { status: 400 })
    const whatsapp = String(b.whatsapp || '').trim() ? formatPhone(String(b.whatsapp)).replace(/\D/g, '') : null
    if (whatsapp && !/^[0-9]{8,15}$/.test(whatsapp)) return NextResponse.json({ error: 'رقم الواتساب غير صحيح' }, { status: 400 })

    const channels = (Array.isArray(b.channels) ? b.channels : []).filter((c: string) => c === 'email' || c === 'whatsapp')
    if (!channels.length) return NextResponse.json({ error: 'اختر طريقة الإرسال: إيميل أو واتساب' }, { status: 400 })
    if (channels.includes('email') && !email) return NextResponse.json({ error: 'اكتب إيميل المحاسب أو شيل الإرسال بالإيميل' }, { status: 400 })
    if (channels.includes('whatsapp') && !whatsapp) return NextResponse.json({ error: 'اكتب رقم واتساب المحاسب أو شيل الإرسال بالواتساب' }, { status: 400 })

    const allowed = new Set(ACC_SECTIONS.map(s => s.key))
    const sections = [...new Set((Array.isArray(b.sections) ? b.sections : []).filter((s: any) => allowed.has(s)))]
    if (!sections.length) return NextResponse.json({ error: 'اختر وش يوصل للمحاسب' }, { status: 400 })

    const frequency: AccFrequency = ['daily', 'weekly', 'monthly'].includes(b.frequency) ? b.frequency : 'monthly'
    const weekday = Number.isInteger(b.weekday) && b.weekday >= 0 && b.weekday <= 6 ? b.weekday : 0
    const month_day = Number.isInteger(b.month_day) && b.month_day >= 1 && b.month_day <= 28 ? b.month_day : 1
    const send_hour = Number.isInteger(b.send_hour) && b.send_hour >= 0 && b.send_hour <= 23 ? b.send_hour : 8

    const db = sb()
    let branch_id: string | null = null
    if (b.branch_id) {
      if (!UUID_RE.test(b.branch_id)) return NextResponse.json({ error: 'الفرع غير صالح' }, { status: 400 })
      const { data: br } = await db.from('branches').select('id').eq('id', b.branch_id).eq('org_id', b.org_id).maybeSingle()
      if (!br) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
      branch_id = b.branch_id
    }

    const { data: cur } = await db.from('accountant_links').select('frequency,weekday,month_day,send_hour,last_period_end').eq('org_id', b.org_id).maybeSingle()
    // أول حفظ أو تغيير الموعد: نبدأ من الموعد الجاي — ما نرسل فترة فاتت فجأة
    const scheduleChanged = !cur || (cur as any).frequency !== frequency || (cur as any).weekday !== weekday || (cur as any).month_day !== month_day || (cur as any).send_hour !== send_hour
    const sched = { frequency, weekday, month_day, send_hour }
    const last_period_end = scheduleChanged ? latestPeriod(sched, scheduleToday(sched)).end : (cur as any).last_period_end

    const row = { org_id: b.org_id, branch_id, name, email, whatsapp, channels, sections, frequency, weekday, month_day, send_hour,
      vat_registered: b.vat_registered !== false, is_active: b.is_active !== false, last_period_end, updated_at: new Date().toISOString() }
    const { data, error } = await db.from('accountant_links').upsert(row as any, { onConflict: 'org_id' }).select(FIELDS).single()
    if (error) return NextResponse.json({ error: 'تعذر الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true, link: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إيقاف الربط وحذف بيانات المحاسب
export async function DELETE(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id')
    const g = await ownerOnly(org_id); if (g.error) return g.error
    const { error } = await sb().from('accountant_links').delete().eq('org_id', org_id!)
    if (error) return NextResponse.json({ error: 'تعذر الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// «أرسل الحين» — الفترة اللي يختارها المالك (ما تأثر على الموعد المجدول)
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const g = await ownerOnly(b.org_id); if (g.error) return g.error
    const db = sb()
    const { data: link } = await db.from('accountant_links').select(FIELDS).eq('org_id', b.org_id).maybeSingle()
    if (!link) return NextResponse.json({ error: 'احفظ بيانات المحاسب أول' }, { status: 400 })
    if (!(await isSubscriptionActive(db, b.org_id))) return NextResponse.json({ error: 'اشتراكك منتهي — جدّده عشان يشتغل الربط' }, { status: 403 })

    const { count } = await db.from('accountant_reports').select('id', { count: 'exact', head: true })
      .eq('org_id', b.org_id).eq('is_test', true).gte('created_at', new Date(Date.now() - 3600e3).toISOString())
    if ((count || 0) >= TEST_PER_HOUR) return NextResponse.json({ error: 'أرسلت تقارير كثيرة خلال ساعة — جرّب بعد شوي' }, { status: 429 })

    const KEYS: ManualPeriodKey[] = ['scheduled', 'last_month', 'this_month', 'last_week', 'yesterday', 'custom']
    const key: ManualPeriodKey = KEYS.includes(b.period) ? b.period : 'scheduled'
    if (key === 'custom') {
      const p = customPeriod(String(b.from || ''), String(b.to || ''), saudiToday())
      if (typeof p === 'string') return NextResponse.json({ error: p }, { status: 400 })
      const r = await sendAccountantReport(db, link as any, p, { manual: true })
      const failed = [r.email_status === 'failed' && 'الإيميل', r.whatsapp_status === 'failed' && 'الواتساب'].filter(Boolean)
      if (failed.length) return NextResponse.json({ success: false, error: `ما وصل عن طريق ${failed.join(' و')} — تأكد من البيانات وجرّب مرة ثانية`, ...r })
      return NextResponse.json({ success: true, ...r })
    }
    const period = manualPeriod(key, link as any, saudiToday())
    if (!period) return NextResponse.json({ error: 'الشهر بدأ اليوم — ما فيه أيام مكتملة لسا' }, { status: 400 })
    const r = await sendAccountantReport(db, link as any, period, { manual: true })
    const failed = [r.email_status === 'failed' && 'الإيميل', r.whatsapp_status === 'failed' && 'الواتساب'].filter(Boolean)
    if (failed.length) return NextResponse.json({ success: false, error: `ما وصل عن طريق ${failed.join(' و')} — تأكد من البيانات وجرّب مرة ثانية`, ...r })
    return NextResponse.json({ success: true, ...r })
  } catch {
    return NextResponse.json({ error: 'تعذر الإرسال، حاول مرة ثانية' }, { status: 500 })
  }
}
